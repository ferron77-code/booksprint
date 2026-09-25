-- Worldwide Distributors — 12: stop the notification worker's functions being
-- callable from a browser. Applied to the live project 25 Sep 2026.
--
-- WHY
-- ---
-- Supabase's security advisor flagged fourteen SECURITY DEFINER functions as
-- executable by `anon`. Most were false positives — changes_since gates itself
-- on current_role_is/is_assigned_to, rls_auto_enable only runs as an event
-- trigger — but five were real, and one was serious:
--
--   claim_notifications  returns full_name, phone and push_token. Anyone
--                        holding the publishable key (which ships in the page)
--                        could read the crew's names and mobile numbers.
--                        Worse, claiming increments attempts, and the queue
--                        skips anything at attempts >= 3 — so three calls
--                        would silently stop every pending notification.
--   mark_notification    could then mark those same notifications as sent.
--   queue_notification   could push arbitrary SMS to staff, URGENT prefix and
--                        all, using recipient ids the claim call had leaked.
--   queue_translation    could churn re-translations and burn API credit.
--   requeue_stale_claims worker plumbing, no business being public.
--
-- Nothing in either app calls any of them. The browsers use only
-- correct_translation, apply_synced_stage and apply_synced_signoff; the
-- worker runs as service_role, which ignores these grants entirely.
--
-- THE PART THAT IS EASY TO GET WRONG
-- ----------------------------------
-- Revoking from anon and authenticated alone does nothing. Postgres grants
-- EXECUTE to PUBLIC by default — visible as a bare `=X/postgres` in proacl —
-- and both roles inherit it. The revoke has to name PUBLIC, and then the
-- roles that genuinely need it have to be granted back explicitly, including
-- service_role.
--
-- And do NOT take queue_notification or queue_translation away from
-- `authenticated`. notify_on_stage, notify_on_assignment and
-- note_translate_trigger are not SECURITY DEFINER, so they run as whoever
-- fired them. Revoke that grant and the next time the office moves a job to
-- Needs review the trigger is denied and the whole stage update fails.
--
-- Making those three triggers SECURITY DEFINER would let us close that too.
-- Worth doing; not done here, because it changes trigger semantics and
-- deserves its own migration.

begin;

-- worker-only: nothing but the notification worker should ever call these
revoke execute on function public.claim_notifications(integer) from public, anon, authenticated;
grant  execute on function public.claim_notifications(integer) to service_role;

revoke execute on function public.mark_notification(uuid, public.notify_state, text, text) from public, anon, authenticated;
grant  execute on function public.mark_notification(uuid, public.notify_state, text, text) to service_role;

revoke execute on function public.requeue_stale_claims(interval) from public, anon, authenticated;
grant  execute on function public.requeue_stale_claims(interval) to service_role;

-- called by triggers running as the signed-in user, so authenticated keeps it;
-- only anonymous callers lose it
revoke execute on function public.queue_notification(uuid, uuid, public.notify_kind, uuid) from public, anon;
grant  execute on function public.queue_notification(uuid, uuid, public.notify_kind, uuid) to authenticated, service_role;

revoke execute on function public.queue_translation(uuid) from public, anon;
grant  execute on function public.queue_translation(uuid) to authenticated, service_role;

commit;

-- Verify with:
--   select p.proname,
--          has_function_privilege('anon', p.oid, 'EXECUTE')          as anon,
--          has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated,
--          has_function_privilege('service_role', p.oid, 'EXECUTE')  as service_role
--     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--    where n.nspname = 'public'
--      and p.proname in ('claim_notifications','mark_notification',
--                        'queue_notification','queue_translation',
--                        'requeue_stale_claims');
--
-- Expected: anon false everywhere; authenticated false except the two
-- trigger-called functions; service_role true throughout.
