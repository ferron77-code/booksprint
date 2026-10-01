-- ===============================================================
-- Worldwide Distributors Inc. — migration 13: scope editing + history
-- DRAFT — NOT YET APPLIED to the live database.
-- ===============================================================
-- What Charlie asked for: let the crew edit the work order — add or remove
-- lines — and keep a history of who did what.
--
-- The asymmetry this migration enforces, and why:
--
--   ADDING is pure upside. Crews find extra work on every job. Today that
--   discovery has nowhere to go but a voice note, so it gets quoted late or
--   not at all. A technician on an assigned job can add a line.
--
--   REMOVING is a money question. Scope is what was quoted and billed. A crew
--   deleting "replace transformer" either throws away billable work or hides
--   that it was never done. So a technician cannot delete anything. They flag
--   a line "not needed" with a reason; it greys out on the phone, and the
--   office sees the flag and decides. Only the office can truly delete.
--
--   REWORDING a quoted line is the office's. A technician can fix the wording
--   of a line they added themselves; they cannot rewrite a line the office
--   quoted. That stays possible today — tech_ticks_scope_own_job is an UPDATE
--   policy with no column restriction, and `authenticated` holds UPDATE on
--   every column including body, so a technician can silently rewrite quoted
--   text right now with nothing recording it. This migration closes that.
--
-- Naming: notes and photos use hidden_at/hidden_by (migrations 07 and 11).
-- Scope uses removed_at/removed_by/removed_reason instead, because this is a
-- work and billing decision the office has to see and act on, not a tidy-up.
-- A reviewer seeing `hidden_at` would read it as moderation.

begin;

-- ---------------------------------------------------------------
-- 1. Audit columns. scope_item had none at all beyond done_by/done_at.
-- ---------------------------------------------------------------
alter table scope_item
  add column if not exists created_by uuid references app_user(id),
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists removed_at timestamptz,
  add column if not exists removed_by uuid references app_user(id),
  add column if not exists removed_reason text,
  add column if not exists removed_reason_es text;

-- Existing rows got created_at = now() from the default, which is a lie.
-- Date them to their work order instead; author stays unknown (it was office).
update scope_item s set created_at = w.created_at
  from work_order w where w.id = s.work_order_id;

-- ---------------------------------------------------------------
-- 2. The history table. Same shape as stage_event (migration 01).
-- ---------------------------------------------------------------
-- scope_item_id is nullable with ON DELETE SET NULL so that an office hard
-- delete does not erase the history of the line. body_before/body_after keep
-- the words regardless. changed_by_name is denormalised on purpose: an audit
-- row should still read correctly after a staff member is renamed or
-- deactivated, and it keeps the crew's phones from needing to read app_user.
create table if not exists scope_event (
  id              uuid primary key default gen_random_uuid(),
  work_order_id   uuid not null references work_order(id) on delete cascade,
  scope_item_id   uuid references scope_item(id) on delete set null,
  action          text not null check (action in
                    ('added','edited','removed','restored','ticked','unticked','deleted')),
  body_before     text,
  body_after      text,
  reason          text,
  changed_by      uuid references app_user(id),
  changed_by_name text,
  changed_at      timestamptz not null default now()
);

create index if not exists scope_event_wo_idx on scope_event (work_order_id, changed_at desc);

alter table scope_event enable row level security;

drop policy if exists office_reads_scope_events on scope_event;
create policy office_reads_scope_events on scope_event
  for select using (current_role_is('owner') or current_role_is('office'));

-- The crew sees the history of their own job. Everyone on the same page.
drop policy if exists tech_reads_scope_events_own_job on scope_event;
create policy tech_reads_scope_events_own_job on scope_event
  for select using (current_role_is('technician') and is_assigned_to(work_order_id));

-- Nobody writes this table by hand. The trigger below is SECURITY DEFINER,
-- so it writes regardless of RLS and needs no INSERT policy at all.
revoke insert, update, delete on scope_event from anon, authenticated;

-- ---------------------------------------------------------------
-- 3. Stamping and guarding, BEFORE the row lands.
-- ---------------------------------------------------------------
-- Attribution is taken from the session, never from what the client sent, so
-- a phone cannot claim someone else added or ticked a line.
create or replace function scope_item_stamp() returns trigger
language plpgsql security invoker set search_path = public as $$
declare
  me       uuid := current_app_user_id();
  is_tech  boolean := current_role_is('technician');
  is_robot boolean := current_user in ('postgres','service_role','supabase_admin');
begin
  if tg_op = 'INSERT' then
    new.created_by := coalesce(me, new.created_by);
    new.created_at := now();
    new.removed_at := null;
    new.removed_by := null;
    return new;
  end if;

  -- created_* is write-once.
  new.created_by := old.created_by;
  new.created_at := old.created_at;

  if new.done is distinct from old.done then
    new.done_by := me;
    new.done_at := case when new.done then now() else null end;
  end if;

  if old.removed_at is null and new.removed_at is not null then
    new.removed_at := now();
    new.removed_by := me;
  elsif old.removed_at is not null and new.removed_at is null then
    new.removed_by      := null;
    new.removed_reason  := null;
    new.removed_reason_es := null;
  else
    new.removed_at := old.removed_at;
    new.removed_by := old.removed_by;
  end if;

  if is_tech and not is_robot then
    -- A technician may reword a line they added; not one the office quoted.
    if new.body is distinct from old.body and old.created_by is distinct from me then
      raise exception 'Only the office can change the wording of a quoted line. Mark it not needed instead, or add a new line.'
        using errcode = '42501';
    end if;
    if new.work_order_id is distinct from old.work_order_id then
      raise exception 'A scope line cannot be moved to another job' using errcode = '42501';
    end if;
    if new.position is distinct from old.position then
      raise exception 'Only the office can reorder the scope' using errcode = '42501';
    end if;
    -- Removing needs a reason in words; that is the whole point of the flag.
    if new.removed_at is not null and old.removed_at is null
       and coalesce(btrim(new.removed_reason), '') = '' then
      raise exception 'Say why this line is not needed' using errcode = '23514';
    end if;
  end if;

  return new;
end $$;

drop trigger if exists scope_item_stamp on scope_item;
create trigger scope_item_stamp before insert or update on scope_item
  for each row execute function scope_item_stamp();

-- ---------------------------------------------------------------
-- 4. The history writer, AFTER the row lands.
-- ---------------------------------------------------------------
create or replace function log_scope_event() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  actor uuid := current_app_user_id();
  who   text;
begin
  select full_name into who from app_user
   where id = coalesce(actor, case when tg_op = 'DELETE' then old.created_by else new.created_by end);

  if tg_op = 'INSERT' then
    insert into scope_event (work_order_id, scope_item_id, action, body_after, changed_by, changed_by_name)
      values (new.work_order_id, new.id, 'added', new.body, coalesce(actor, new.created_by), who);
    return null;
  end if;

  if tg_op = 'DELETE' then
    -- scope_item_id stays null: the row it would point at is already gone.
    insert into scope_event (work_order_id, scope_item_id, action, body_before, changed_by, changed_by_name)
      values (old.work_order_id, null, 'deleted', old.body, actor, who);
    return null;
  end if;

  if new.body is distinct from old.body then
    insert into scope_event (work_order_id, scope_item_id, action, body_before, body_after, changed_by, changed_by_name)
      values (new.work_order_id, new.id, 'edited', old.body, new.body, actor, who);
  end if;

  if old.removed_at is null and new.removed_at is not null then
    insert into scope_event (work_order_id, scope_item_id, action, body_before, reason, changed_by, changed_by_name)
      values (new.work_order_id, new.id, 'removed', new.body, new.removed_reason, actor, who);
  elsif old.removed_at is not null and new.removed_at is null then
    insert into scope_event (work_order_id, scope_item_id, action, body_after, changed_by, changed_by_name)
      values (new.work_order_id, new.id, 'restored', new.body, actor, who);
  end if;

  if new.done is distinct from old.done then
    insert into scope_event (work_order_id, scope_item_id, action, body_after, changed_by, changed_by_name)
      values (new.work_order_id, new.id,
              case when new.done then 'ticked' else 'unticked' end, new.body, actor, who);
  end if;

  return null;
end $$;

drop trigger if exists log_scope_event on scope_item;
create trigger log_scope_event after insert or update or delete on scope_item
  for each row execute function log_scope_event();

-- Migration 12's lesson: a new function is EXECUTE TO PUBLIC by default.
-- Postgres does not check EXECUTE on a trigger function, but spell it out so
-- neither of these shows up as anon-callable in the next audit.
revoke execute on function scope_item_stamp() from public, anon;
revoke execute on function log_scope_event() from public, anon;
grant  execute on function scope_item_stamp() to authenticated, service_role;
grant  execute on function log_scope_event()  to authenticated, service_role;

-- ---------------------------------------------------------------
-- 5. Policies: technicians may add, and may not delete.
-- ---------------------------------------------------------------
-- scope_item had NO insert policy and NO delete policy, so RLS default-denied
-- both for technicians. Adding one insert policy; still no delete policy, which
-- is what keeps a crew from destroying quoted work.
drop policy if exists tech_adds_scope_own_job on scope_item;
create policy tech_adds_scope_own_job on scope_item
  for insert to authenticated
  with check (current_role_is('technician') and is_assigned_to(work_order_id));

-- Removed lines stay visible to the crew, greyed out, so the same list reads
-- the same on the phone and in the office. No change to the read policy.

commit;

-- ---------------------------------------------------------------
-- Follow-up, deliberately not in this migration:
--   translate-notes already does scope_item.body -> body_es. Adding
--   removed_reason -> removed_reason_es is a one-line change to that edge
--   function and should ship with it, not here.
-- ---------------------------------------------------------------
