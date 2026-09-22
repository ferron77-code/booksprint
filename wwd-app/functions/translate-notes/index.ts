// Worldwide Distributors: translation worker (Supabase Edge Function "translate-notes"), v5.
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
- English: fix obvious speech-to-text slips only when the meaning is certain.`;

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });

async function both(key: string, text: string): Promise<{ lang: "en" | "es"; en: string; es: string }> {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, max_tokens: 1500, system: SYSTEM,
      messages: [{ role: "user", content: text }] }),
  });
  if (!r.ok) throw new Error(`api ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const out = await r.json();
  const t = (out.content ?? []).filter((c: any) => c.type === "text").map((c: any) => c.text).join("");
  const m = t.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("no json");
  const o = JSON.parse(m[0]);
  if (!o.en || !o.es || !/^(en|es)$/.test(o.lang)) throw new Error("incomplete");
  return { lang: o.lang, en: String(o.en).trim(), es: String(o.es).trim() };
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
