-- ===============================================================
-- Worldwide Distributors Inc. — migration 11: photo remove / restore
-- APPLIED to the live database on 22 Sep 2026.
-- ===============================================================
-- Office can remove a photo (wrong job, blurry, duplicate) without destroying it.
-- Removed photos vanish from the crew's phones and the office view, stay on
-- record with who/when (the file too, since the row still references it), and
-- can be restored. Same pattern as notes (migration 07).

alter table attachment add column if not exists hidden_at timestamptz,
                       add column if not exists hidden_by uuid references app_user(id);

alter policy tech_reads_attachments_own_job on attachment
  using (current_role_is('technician') and is_assigned_to(work_order_id) and hidden_at is null);

create or replace function attachment_guard_hidden() returns trigger language plpgsql as $$
begin
  if (new.hidden_at is distinct from old.hidden_at or new.hidden_by is distinct from old.hidden_by)
     and not (current_role_is('owner') or current_role_is('office'))
     and current_user not in ('postgres','service_role','supabase_admin') then
    raise exception 'Only the office can remove or restore photos' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists attachment_guard_hidden on attachment;
create trigger attachment_guard_hidden before update of hidden_at, hidden_by on attachment
  for each row execute function attachment_guard_hidden();
