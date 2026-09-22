// Worldwide Distributors: translation worker (Supabase Edge Function "translate-notes"), live version 4.
// Called once a minute by pg_cron (see 05-translation-schedule.sql). Needs the
// ANTHROPIC_API_KEY secret in Supabase -> Edge Functions -> Secrets.
//  1. Notes: claims pending notes (skip-locked), translates ES<->EN, writes back
//     via save_translation / fail_translation. A person's correction
//     (translation_edited) is never overwritten; that guard is in save_translation.
//  2. Office text for the crew: fills Spanish copies of job summaries, waiting
//     reasons and checklist lines that the office wrote in English and nobody
//     has translated yet. Filled fields are never touched again.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const MODEL = "claude-haiku-4-5-20251001";
const SYSTEM = `You translate short job-site text for a lighting and electrical contractor in Miami.
The field crew is Cuban and writes or speaks casual Spanish; the office reads and writes English.
Rules:
- Output ONLY the translation. No quotes, no preamble, no notes.
- Keep the meaning and tone plain and practical. Do not add or drop information.
- Keep product names, part numbers, model codes, measurements, addresses, and people's names exactly as written.
- Use normal trade vocabulary (fixture, ballast, driver, conduit, breaker, pole, lamp, LED, wattage).
- When writing Spanish: use correct standard spelling and accents, with plain everyday wording a Cuban tradesman in Miami would use. Never spell out accent or pronunciation (write "confirmado", not "confirmao"). Use "usted" forms only if the source is formal; otherwise neutral wording.
- When writing English: fix obvious speech-to-text slips only where the meaning is certain.
- If the text is already in the target language, return it unchanged.`;

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });

async function translate(key: string, text: string, target: "es" | "en") {
  const to = target === "es" ? "Spanish" : "English";
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, max_tokens: 1024, system: SYSTEM,
      messages: [{ role: "user", content: `Translate into ${to}:\n\n${text}` }] }),
  });
  if (!r.ok) throw new Error(`api ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const out = await r.json();
  const t = (out.content ?? []).filter((c: any) => c.type === "text").map((c: any) => c.text).join("").trim();
  if (!t) throw new Error("empty translation");
  return t;
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
      const text = await translate(key, j.body, j.target_lang);
      const { error: e2 } = await db.rpc("save_translation", { p_note: j.note_id, p_text: text, p_lang: j.target_lang });
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
      const patch: Record<string, string> = {};
      if (w.summary && !w.summary_es) patch.summary_es = await translate(key, w.summary, "es");
      if (w.waiting_reason && !w.waiting_reason_es) patch.waiting_reason_es = await translate(key, w.waiting_reason, "es");
      if (Object.keys(patch).length) {
        let q = db.from("work_order").update(patch).eq("id", w.id);
        if (patch.summary_es) q = q.is("summary_es", null);
        await q; office++;
      }
    } catch (_) { /* next minute */ }
  }
  const { data: items } = await db.from("scope_item").select("id, body").is("body_es", null).limit(20);
  for (const it of items ?? []) {
    try {
      const es = await translate(key, it.body, "es");
      await db.from("scope_item").update({ body_es: es }).eq("id", it.id).is("body_es", null);
      office++;
    } catch (_) { /* next minute */ }
  }

  return json({ ok: true, notes: { claimed: (jobs ?? []).length, done, failed }, office_fields: office });
});
