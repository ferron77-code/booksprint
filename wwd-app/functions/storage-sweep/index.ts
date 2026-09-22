// Worldwide Distributors: storage sweep (Supabase Edge Function "storage-sweep").
// Scheduled daily at 07:15 UTC by pg_cron (migration 09_storage_sweep_schedule).
// Removes files in the private "wwd" bucket that nothing points to any more.
// A file is removed only if EITHER:
//   (a) its job no longer exists (the first folder of the path is a deleted
//       work order) — safe at any age; OR
//   (b) no attachment, note or signature row references it AND it is more than
//       24 hours old — protects uploads whose database row has not landed yet.
// Never touches a file that a row still references.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const BUCKET = "wwd";
const MIN_AGE_MS = 24 * 3600 * 1000;
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });

Deno.serve(async () => {
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } });
  const keep = new Set<string>();
  const [a, n, s, w] = await Promise.all([
    db.from("attachment").select("storage_path"),
    db.from("note").select("audio_path"),
    db.from("work_order_signoff").select("signature_path"),
    db.from("work_order").select("id"),
  ]);
  for (const r of [a, n, s, w]) if (r.error) return json({ ok: false, reason: r.error.message }, 500);
  a.data!.forEach((r: any) => r.storage_path && keep.add(r.storage_path));
  n.data!.forEach((r: any) => r.audio_path && keep.add(r.audio_path));
  s.data!.forEach((r: any) => r.signature_path && keep.add(r.signature_path));
  const jobs = new Set(w.data!.map((r: any) => r.id));

  const files: { path: string; created: string }[] = [];
  async function walk(prefix: string) {
    for (let off = 0; ; off += 1000) {
      const { data, error } = await db.storage.from(BUCKET).list(prefix, { limit: 1000, offset: off });
      if (error) throw new Error(error.message);
      for (const it of data ?? []) {
        const p = prefix ? `${prefix}/${it.name}` : it.name;
        if (it.id) files.push({ path: p, created: it.created_at ?? "" });
        else await walk(p);
      }
      if (!data || data.length < 1000) break;
    }
  }
  try { await walk(""); } catch (e) { return json({ ok: false, reason: String(e) }, 500); }

  const now = Date.now();
  const doomed = files.filter(f => {
    if (keep.has(f.path)) return false;
    if (!jobs.has(f.path.split("/")[0])) return true;
    return now - new Date(f.created).getTime() > MIN_AGE_MS;
  }).map(f => f.path);

  let removed = 0;
  for (let i = 0; i < doomed.length; i += 100) {
    const { data, error } = await db.storage.from(BUCKET).remove(doomed.slice(i, i + 100));
    if (error) return json({ ok: false, reason: error.message, removed }, 500);
    removed += data?.length ?? 0;
  }
  return json({ ok: true, scanned: files.length, kept: files.length - doomed.length, removed });
});
