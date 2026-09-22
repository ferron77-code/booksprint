-- ===============================================================
-- Worldwide Distributors Inc. — migration 04: storage
-- APPLIED to the live database on 22 Sep 2026 (migrations 04_storage + 04b).
-- Supersedes the storage half of 04-views-and-storage.sql.
-- The views half of that file is already applied (03b) — do not run it.
-- ===============================================================
--
-- Written against the paths tech.js actually uses:
--
--   photos     {work_order_id}/{kind}/{uuid}.{ext}     kind = before|after|receipt|other
--   audio      {work_order_id}/audio/{uuid}.{ext}
--   signature  {work_order_id}/signature/{uuid}.png
--
-- Every path starts with the work order id. That first folder is the
-- whole security model here: a technician may read and write objects
-- under a job he is currently assigned to, and nowhere else. Same rule
-- as every table in the system.
--
-- The app uploads with upsert: true, so a retried upload from the
-- offline queue overwrites rather than erroring. Upsert needs INSERT,
-- UPDATE and SELECT all granted, which is why technicians get three
-- policies below. They get no DELETE.
-- ===============================================================


-- ---------------------------------------------------------------
-- The bucket
-- ---------------------------------------------------------------
-- Private: nothing is reachable by URL alone. Files are served through
-- short-lived signed URLs, subject to the policies below.
--
-- 25 MB ceiling. Photos are normally re-encoded to ~1600px JPEG on the
-- phone, a few hundred KB. The ceiling exists for the fallback path,
-- where a phone that cannot decode a HEIC uploads the original.
--
-- The mime list includes application/octet-stream deliberately. The
-- app falls back to a .bin extension for anything it cannot classify,
-- and a refused upload in the field fails silently. A job-scoped,
-- size-capped upload of an odd format is the lesser problem.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'wwd', 'wwd', false, 26214400,
  array[
    'image/jpeg','image/png','image/webp','image/heic','image/heif',
    'audio/webm','audio/mp4','audio/m4a','audio/x-m4a','audio/mpeg',
    'audio/ogg','audio/wav','audio/aac',
    'application/octet-stream'
  ]
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;


-- ---------------------------------------------------------------
-- Reading the job id out of a path, safely
-- ---------------------------------------------------------------
-- A straight ::uuid cast throws on a malformed path, which would turn a
-- permission check into an error. This returns null instead, and
-- is_assigned_to(null) is false, so a bad path is simply refused.

create or replace function public.storage_job_id(p_name text)
returns uuid
language plpgsql
immutable
as $fn$
begin
  return (storage.foldername(p_name))[1]::uuid;
exception when others then
  return null;
end;
$fn$;


-- ---------------------------------------------------------------
-- Policies
-- ---------------------------------------------------------------

drop policy if exists wwd_office_all       on storage.objects;
drop policy if exists wwd_tech_read        on storage.objects;
drop policy if exists wwd_tech_upload      on storage.objects;
drop policy if exists wwd_tech_overwrite   on storage.objects;

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

-- Technician: read files on jobs he is on.
create policy wwd_tech_read on storage.objects for select
  using (
    bucket_id = 'wwd'
    and current_role_is('technician')
    and is_assigned_to(storage_job_id(name))
  );

-- Technician: upload to jobs he is on.
create policy wwd_tech_upload on storage.objects for insert
  with check (
    bucket_id = 'wwd'
    and current_role_is('technician')
    and is_assigned_to(storage_job_id(name))
  );

-- Technician: overwrite on retry. Needed for upsert: true.
-- Only files he uploaded himself, so two men on the same job cannot
-- replace each other's photos. Storage stamps the uploader in owner_id
-- (older rows may only fill owner). Added live as 04b, 22 Sep 2026.
create policy wwd_tech_overwrite on storage.objects for update
  using (
    bucket_id = 'wwd'
    and current_role_is('technician')
    and coalesce(owner_id, owner::text) = auth.uid()::text
    and is_assigned_to(storage_job_id(name))
  )
  with check (
    bucket_id = 'wwd'
    and current_role_is('technician')
    and coalesce(owner_id, owner::text) = auth.uid()::text
    and is_assigned_to(storage_job_id(name))
  );


-- ---------------------------------------------------------------
-- Verification (22 Sep 2026: all rows passed)
-- ---------------------------------------------------------------
-- Bucket should read public = false. Four policies should be listed.
-- The last three rows test the path parser: a real job path returns a
-- uuid, a malformed one returns null rather than throwing.

select 'bucket' as check, id || ' public=' || public::text as result
  from storage.buckets where id = 'wwd'
union all
select 'policy', policyname
  from pg_policies where schemaname = 'storage' and policyname like 'wwd_%'
union all
select 'parse good path',
       coalesce(storage_job_id('99920000-0000-0000-0000-000000000001/before/x.jpg')::text, 'NULL')
union all
select 'parse bad path',
       coalesce(storage_job_id('not-a-uuid/before/x.jpg')::text, 'NULL (correct)')
union all
select 'parse audio path',
       coalesce(storage_job_id('99920000-0000-0000-0000-000000000001/audio/y.m4a')::text, 'NULL');
