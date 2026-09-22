// Worldwide Distributors: translation worker (deployed as Supabase Edge Function "translate-notes").
// Called once a minute by pg_cron. Claims pending notes (skip-locked, so
// overlapping runs never double-translate), translates each ES<->EN with
// Claude, and writes back through save_translation / fail_translation.
// A person's correction (translation_edited) is never overwritten: that
// guard lives in save_translation itself.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const MODEL = "claude-haiku-4-5-20251001";

const SYSTEM = `You translate short job-site notes for a lighting and electrical contractor in Miami.
The field crew is Cuban and writes or speaks casual Cuban Spanish; the office reads English, and sometimes the office writes English for the crew.
Rules:
- Output ONLY the translation. No quotes, no preamble, no notes.
- Keep the meaning and tone plain and practical. Do not add or drop information.
- Keep product names, part numbers, model codes, measurements, addresses, and people's names exactly as written.
- Use normal trade vocabulary (fixture, ballast, driver, conduit, breaker, pole, lamp, LED, wattage).
- If the text is already in the target language, return it unchanged.`;

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });

Deno.serve(async () => {
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  // No key yet: do nothing. Claiming without a key would burn the
  // notes' retry attempts and park them as failed.
  if (!key) return json({ ok: false, reason: "ANTHROPIC_API_KEY not set", claimed: 0 });

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } });

  const { data: jobs, error } = await db.rpc("claim_translations", { p_limit: 10 });
  if (error) return json({ ok: false, reason: error.message }, 500);

  let done = 0, failed = 0;
  for (const j of jobs ?? []) {
    const to = j.target_lang === "es" ? "Spanish (Cuban, as spoken by the crew)" : "English";
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({
          model: MODEL, max_tokens: 1024, system: SYSTEM,
          messages: [{ role: "user", content: `Translate into ${to}:\n\n${j.body}` }],
        }),
      });
      if (!r.ok) throw new Error(`api ${r.status}: ${(await r.text()).slice(0, 200)}`);
      const out = await r.json();
      const text = (out.content ?? []).filter((c: any) => c.type === "text").map((c: any) => c.text).join("").trim();
      if (!text) throw new Error("empty translation");
      const { error: e2 } = await db.rpc("save_translation", { p_note: j.note_id, p_text: text, p_lang: j.target_lang });
      if (e2) throw new Error(e2.message);
      done++;
    } catch (e) {
      failed++;
      await db.rpc("fail_translation", { p_note: j.note_id, p_reason: String((e as Error).message ?? e).slice(0, 500) });
    }
  }
  return json({ ok: true, claimed: (jobs ?? []).length, done, failed });
});
