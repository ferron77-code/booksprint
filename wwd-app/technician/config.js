/* Worldwide Distributors — technician app configuration.

   The public key is meant to ship in the client. Row level security is
   what makes that safe: every query runs as the signed-in man, and the
   database decides what he can see. Either form works with the vendored
   supabase-js: the newer sb_publishable_... key or the legacy eyJ... anon
   JWT. Never the service role / sb_secret_... key — it bypasses every
   policy in the project.

   Where to find it: Supabase → Project Settings → API Keys.
*/
window.WWD = {
  SUPABASE_URL: 'https://sdjheotlpvvkdovrccol.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_abafpRmVSoginW2Nsn6b2A_7OazBHIh',
  BUCKET: 'wwd'          // private storage bucket, created by 04-views-and-storage.sql
};
