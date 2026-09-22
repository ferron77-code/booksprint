-- ===============================================================
-- Worldwide Distributors Inc. — migration 05: translation schedule
-- APPLIED to the live database on 22 Sep 2026.
-- ===============================================================
-- Runs the translate-notes edge function once a minute via pg_cron.
-- The bearer token is the project's public anon key (it already ships in
-- the app); it only satisfies the function's JWT check. The function uses
-- the service role internally and does nothing when no work is queued.
-- The function source lives in wwd-app/functions/translate-notes/index.ts
-- and needs the ANTHROPIC_API_KEY secret set in Supabase → Edge Functions.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule(jobid) from cron.job where jobname = 'translate-notes';

select cron.schedule(
  'translate-notes',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://sdjheotlpvvkdovrccol.supabase.co/functions/v1/translate-notes',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'Authorization','Bearer <PROJECT_ANON_KEY>'),
    body := '{}'::jsonb,
    timeout_milliseconds := 55000
  );
  $$
);
