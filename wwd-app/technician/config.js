/* Worldwide Distributors — technician app configuration.

   The anon public key is meant to ship in the client. Row level security
   is what makes that safe: every query below runs as the signed-in man,
   and the database decides what he can see. Never put the service role
   key here — it bypasses every policy in the project.

   Where to find the key: Supabase → Project Settings → API → "anon public".
*/
window.WWD = {
  SUPABASE_URL: 'https://sdjheotlpvvkdovrccol.supabase.co',
  SUPABASE_ANON_KEY: 'PASTE_ANON_PUBLIC_KEY_HERE',
  BUCKET: 'wwd'          // private storage bucket, created by 04-views-and-storage.sql
};
