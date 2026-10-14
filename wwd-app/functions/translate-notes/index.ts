// Worldwide Distributors: translation worker (Supabase Edge Function "translate-notes"), v6.
// Called once a minute by pg_cron.
// Every piece of text is first identified as English or Spanish, then stored in
// BOTH languages, so the English view is all English and the Spanish view is
// all Spanish, whichever language someone happened to write in.
//  1. Notes: claims pending notes (skip-locked). Detects the real language (the
//     phone's language setting is only a hint), corrects original_lang if needed,
//     and saves the translation into the other language via save_translation.
//     A person's correction (translation_edited) is never overwritten.
//  2. Office text (job summary, waiting reason, checklist lines): for any row
//     whose Spanish copy is empty, stores English in the main field and Spanish
//     in the _es field. Guarded so a row edited in the meantime is left alone.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const MODEL = "claude-haiku-4-5-20251001";
const SYSTEM = `You handle short job-site text for a Miami lighting, landscape-lighting and electrical contractor.
The field crew is Cuban and writes or speaks casual Spanish; the office writes mostly English but sometimes Spanish, sometimes a mix.
For the text given, reply with ONLY a JSON object: {"lang":"en" or "es", "en":"English version", "es":"Spanish version"}.
"lang" is the language the text is mainly written in. One of en/es is the original (lightly cleaned: fix accents and obvious typos only), the other is the translation.
Rules for both versions:
- Same meaning and plain practical tone. Do not add or drop information.
- NEVER translate proper names: people, businesses, properties, buildings, parks, streets, addresses (e.g. "Westpointe Business Park", "Palmetto Doral Condo Association", "NW 79 Ave").
- NEVER translate brand or product/model names; keep them exactly (e.g. Epic, Bentley, Kichler, FX Luminaire, Hunter). Keep quantities like (11), part numbers, measurements.
- Trade meaning: "cut lines" = damaged/cut wires ("líneas/cables cortados"); "palm rings" = tree-mounting rings for palm uplights ("anillos para palmas"); "bury wires" = "enterrar los cables"; "monument" = entrance sign ("monumento"); "transformer" = "transformador"; "timer" = "temporizador"; "fixture" = "lámpara"/"luminaria".
- Spanish: correct spelling and accents, everyday wording a Cuban tradesman in Miami uses; never spell out pronunciation.
- English: fix obvious speech-to-text slips only when the meaning is certain.
- ALWAYS return the JSON object, whatever the text is. A greeting, a thank-you, a
  single word, a half-finished sentence or an unclear recording still gets the
  envelope: put the text in its own language and the translation in the other.
  Never reply conversationally and never answer the text — only translate it.`;

// The shape is a property of the request, not something we ask for and hope for.
// Voice notes are the reason: a transcript is often a fragment or a pleasantry,
// and asked to handle "Thank you" the model would reply with a pleasantry of its
// own instead of the envelope, which the parser below saw as "no json".
const FORMAT = {
  type: "json_schema",
  schema: {
    type: "object",
    properties: {
      lang: { type: "string", enum: ["en", "es"] },
      en: { type: "string" },
      es: { type: "string" },
    },
    required: ["lang", "en", "es"],
    additionalProperties: false,
  },
} as const;

// Thrown only when the API rejects output_config itself, so that an unsupported
// parameter costs us the guarantee and nothing else. Any other failure is real
// and propagates to translate_error as before.
class FormatUnsupported extends Error {}

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });

type Pair = { lang: "en" | "es"; en: string; es: string };

async function ask(key: string, text: string, structured: boolean): Promise<Pair> {
  const body: Record<string, unknown> = {
    model: MODEL, max_tokens: 1500, system: SYSTEM,
    messages: [{ role: "user", content: text }],
  };
  if (structured) body.output_config = { format: FORMAT };

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const detail = (await r.text()).slice(0, 300);
    if (structured && r.status === 400 && /output_config|format|schema/i.test(detail)) {
      throw new FormatUnsupported(detail);
    }
    throw new Error(`api ${r.status}: ${detail}`);
  }

  const out = await r.json();
  // A policy decline comes back 200 with no usable content; say so plainly
  // rather than reporting it as malformed JSON.
  if (out.stop_reason === "refusal") throw new Error("refused by the model");

  const t = (out.content ?? []).filter((c: any) => c.type === "text").map((c: any) => c.text).join("");
  // With output_config the text is the object itself; the brace match also
  // covers the fallback path, where the model may wrap it in a sentence.
  const m = t.match(/\{[\s\S]*\}/);
  if (!m) throw new Error(`no json: ${t.slice(0, 120) || "(empty reply)"}`);
  const o = JSON.parse(m[0]);
  if (!o.en || !o.es || !/^(en|es)$/.test(o.lang)) throw new Error("incomplete");
  return { lang: o.lang, en: String(o.en).trim(), es: String(o.es).trim() };
}

async function both(key: string, text: string): Promise<Pair> {
  try {
    return await ask(key, text, true);
  } catch (e) {
    if (!(e instanceof FormatUnsupported)) throw e;
    console.warn("output_config rejected, falling back to the prompt contract:", e.message);
    return await ask(key, text, false);
  }
}

Deno.serve(async () => {
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) return json({ ok: false, reason: "ANTHROPIC_API_KEY not set", claimed: 0 });
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } });

  const { data: jobs, error } = await db.rpc("claim_translations", { p_limit: 10 });
  if (error) return json({ ok: false, reason: error.message }, 500);
  let done = 0, failed = 0;
  for (const j of jobs ?? []) {
    try {
      const b = await both(key, j.body);
      const target = b.lang === "es" ? "en" : "es";
      if (b.lang !== j.source_lang) await db.from("note").update({ original_lang: b.lang }).eq("id", j.note_id);
      const { error: e2 } = await db.rpc("save_translation", { p_note: j.note_id, p_text: target === "en" ? b.en : b.es, p_lang: target });
      if (e2) throw new Error(e2.message);
      done++;
    } catch (e) {
      failed++;
      await db.rpc("fail_translation", { p_note: j.note_id, p_reason: String((e as Error).message ?? e).slice(0, 500) });
    }
  }

  let office = 0;
  const { data: wos } = await db.from("work_order")
    .select("id, summary, summary_es, waiting_reason, waiting_reason_es")
    .or("and(summary_es.is.null,summary.not.is.null),and(waiting_reason_es.is.null,waiting_reason.not.is.null)")
    .limit(10);
  for (const w of wos ?? []) {
    try {
      if (w.summary && !w.summary_es) {
        const b = await both(key, w.summary);
        await db.from("work_order").update({ summary: b.en, summary_es: b.es }).eq("id", w.id).eq("summary", w.summary).is("summary_es", null);
        office++;
      }
      if (w.waiting_reason && !w.waiting_reason_es) {
        const b = await both(key, w.waiting_reason);
        await db.from("work_order").update({ waiting_reason: b.en, waiting_reason_es: b.es }).eq("id", w.id).eq("waiting_reason", w.waiting_reason).is("waiting_reason_es", null);
        office++;
      }
    } catch (_) { /* next minute */ }
  }
  const { data: items } = await db.from("scope_item").select("id, body").is("body_es", null).limit(20);
  for (const it of items ?? []) {
    try {
      const b = await both(key, it.body);
      await db.from("scope_item").update({ body: b.en, body_es: b.es }).eq("id", it.id).eq("body", it.body).is("body_es", null);
      office++;
    } catch (_) { /* next minute */ }
  }

  return json({ ok: true, notes: { claimed: (jobs ?? []).length, done, failed }, office_fields: office });
});
