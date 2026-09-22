// Worldwide Distributors: scan-ticket (Supabase Edge Function).
// The office photographs a handwritten eLighting/eBuilt work order; this reads it
// and returns the fields for the New Work Order form. It never saves anything:
// the office checks the result and presses Create. Only signed-in owner/office
// accounts may call it. Needs the ANTHROPIC_API_KEY secret.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const MODEL = "claude-sonnet-5";
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

const PROMPT = `This is a photo of a handwritten work order ticket from eLighting / eBuilt, a Miami lighting and electrical contractor.
The printed form has these fields: Date, Rep, Customer name, Contact info, Address, Scope of work. It may also carry a printed or written ticket number.
Read it and reply with ONLY a JSON object, no other text:
{
  "date": "YYYY-MM-DD or null",
  "rep": "name or null",
  "customer_name": "string or null",
  "contact_name": "string or null",
  "contact_phone": "digits as written, or null",
  "address": "full address as one line, or null",
  "scope_lines": ["one task per item, in order, as written"],
  "ticket_number": "string or null",
  "unclear": ["field names you could not read with confidence"]
}
Rules: copy what is written; do not invent anything. If a field is blank or unreadable use null and list it in "unclear". Fix obvious spelling only when certain. Keep abbreviations like Bld. as written. If the scope is written in Spanish, keep it in Spanish.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) return json({ error: "Scanning is not set up yet (missing API key)." }, 503);
  let body: any; try { body = await req.json(); } catch { return json({ error: "Bad request" }, 400); }

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } }, auth: { persistSession: false } });
  const { data: { user } } = await db.auth.getUser();
  if (!user) return json({ error: "Sign in first." }, 401);
  const { data: me } = await db.from("app_user").select("role").eq("auth_id", user.id).maybeSingle();
  if (!me || !["owner", "office"].includes(me.role)) return json({ error: "Office accounts only." }, 403);

  const img = String(body.image_base64 || ""), mt = String(body.media_type || "image/jpeg");
  if (!img || img.length > 8_000_000) return json({ error: "Photo missing or too large." }, 400);
  if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(mt)) return json({ error: "Use a JPEG or PNG photo." }, 400);

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, max_tokens: 1500, messages: [{ role: "user", content: [
      { type: "image", source: { type: "base64", media_type: mt, data: img } },
      { type: "text", text: PROMPT } ] }] }),
  });
  if (!r.ok) return json({ error: `Could not read the photo (${r.status}).`, detail: (await r.text()).slice(0, 300) }, 502);
  const out = await r.json();
  const text = (out.content ?? []).filter((c: any) => c.type === "text").map((c: any) => c.text).join("");
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return json({ error: "Could not make out a ticket in that photo." }, 422);
  try { return json({ ok: true, fields: JSON.parse(m[0]) }); }
  catch { return json({ error: "Could not make out a ticket in that photo." }, 422); }
});
