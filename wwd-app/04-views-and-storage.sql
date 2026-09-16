-- ===============================================================
-- Worldwide Distributors Inc. — migration 04: views + storage
-- Run AFTER 03-test-data.sql, once, in the SQL editor. Safe to re-run.
-- ===============================================================
--
-- Two things the technician app needs before it can go live.
--
-- 1. THE VIEWS BYPASSED RLS.
--    Every view in 00 was created the default way, which in Postgres
--    means it runs with the rights of its OWNER (postgres), not the
--    person querying it. Supabase exposes every view in public over
--    the API. So a technician holding the anon key and his own
--    session could read work_order_current_crew for every job in the
--    company, job_hours_by_person for every man, and note_reader for
--    every note — three things the specification says he must never
--    see. No dollar figure was reachable (none is stored anywhere),
--    but "one crew cannot see where another crew is" was not true.
--
--    security_invoker makes each view run as the caller, so the
--    policies on the underlying tables apply. Needs Postgres 15+,
--    which every Supabase project created since 2023 has.
--
--    The app queries tables directly and never these views, so it
--    works whether or not this has been run. The dashboard and the
--    workers (service role) are unaffected. This is about closing a
--    door, not opening one.
--
-- 2. THERE WAS NO STORAGE BUCKET.
--    Photos, receipts, voice audio and signatures need somewhere to
--    go. One private bucket, with object paths that start with the
--    work order's id, and policies that grant access by the same
--    rule as everything else: office sees all, a technician sees
--    only jobs he is currently on.
-- ===============================================================


-- ---------------------------------------------------------------
-- 1. Views run as the caller
-- ---------------------------------------------------------------

alter view work_order_current_crew set (security_invoker = true);
alter view job_hours_by_person     set (security_invoker = true);
alter view job_hours_total         set (security_invoker = true);
alter view job_helper_hours        set (security_invoker = true);
alter view job_labour_summary      set (security_invoker = true);
alter view note_reader             set (security_invoker = true);
alter view translation_backlog     set (security_invoker = true);
alter view notification_outbox     set (security_invoker = true);


-- ---------------------------------------------------------------
-- 2. Storage bucket
-- ---------------------------------------------------------------
-- Private: nothing is served without a signed URL or a session.
-- 25 MB cap per object. A phone photo shrunk to 1600px is ~300 KB;
-- a two-minute voice note is ~1-2 MB. Anything near the cap is a
-- mistake, and the cap is what stops it costing money.

insert into storage.buckets (id, name, public, file_size_limit)
values ('wwd', 'wwd', false, 26214400)
on conflict (id) do update set public = false, file_size_limit = 26214400;


-- ---------------------------------------------------------------
-- Object path convention, enforced by the policies below:
--
--   <work_order_id>/<kind>/<row_id>.<ext>
--
--   before | after | receipt | other   attachment photos
--   audio                              note.audio_path
--   signature                          work_order_signoff.signature_path
--
-- The first folder is the job. That is what the access rule keys on.
-- ---------------------------------------------------------------

-- The job an object belongs to, or null if the path is malformed.
-- Kept as a function so a bad path fails closed instead of raising
-- inside a policy. It touches no table, so it needs no privileges.
create or replace function storage_object_job(p_name text) returns uuid
language sql immutable as $$
  select case
    when p_name ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/'
    then split_part(p_name, '/', 1)::uuid
    else null
  end;
$$;

drop policy if exists wwd_office_all      on storage.objects;
drop policy if exists wwd_tech_read       on storage.objects;
drop policy if exists wwd_tech_write      on storage.objects;
drop policy if exists wwd_tech_update     on storage.objects;

-- Office and owner: everything in the bucket.
create policy wwd_office_all on storage.objects for all
  using (
    bucket_id = 'wwd'
    and (current_role_is('owner') or current_role_is('office'))
  )
  with check (
    bucket_id = 'wwd'
    and (current_role_is('owner') or current_role_is('office'))
  );

-- A technician: objects belonging to a job he is currently on.
create policy wwd_tech_read on storage.objects for select
  using (
    bucket_id = 'wwd'
    and current_role_is('technician')
    and storage_object_job(name) is not null
    and is_assigned_to(storage_object_job(name))
  );

create policy wwd_tech_write on storage.objects for insert
  with check (
    bucket_id = 'wwd'
    and current_role_is('technician')
    and storage_object_job(name) is not null
    and is_assigned_to(storage_object_job(name))
  );

-- Needed because the app uploads with upsert, so a retry after a
-- half-finished upload replaces the object rather than failing.
-- He may only replace what he uploaded himself. Storage stamps the
-- uploader on the object (owner_id; the older owner column is kept
-- for projects that still fill only that one).
create policy wwd_tech_update on storage.objects for update
  using (
    bucket_id = 'wwd'
    and current_role_is('technician')
    and coalesce(owner_id, owner::text) = auth.uid()::text
    and storage_object_job(name) is not null
    and is_assigned_to(storage_object_job(name))
  )
  with check (
    bucket_id = 'wwd'
    and current_role_is('technician')
    and coalesce(owner_id, owner::text) = auth.uid()::text
    and storage_object_job(name) is not null
    and is_assigned_to(storage_object_job(name))
  );

-- No delete policy for technicians. A photo, once filed, is part of
-- the record. Removal is an office act, and retention_purge handles
-- the rest.


-- ---------------------------------------------------------------
-- 3. Verification
-- ---------------------------------------------------------------
-- All eight views should show security_invoker=true, and the bucket
-- should exist with four policies on storage.objects.

select c.relname as view_name,
       coalesce(
         (select true from unnest(c.reloptions) o where o = 'security_invoker=true'),
         false) as runs_as_caller
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'v'
order by runs_as_caller, c.relname;

select id, public, file_size_limit from storage.buckets where id = 'wwd';

select polname, polcmd
from pg_policy
where polrelid = 'storage.objects'::regclass and polname like 'wwd_%'
order by polname;
