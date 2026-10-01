-- ===============================================================
-- Worldwide Distributors Inc. — migration 13: office edits + history
-- APPLIED to the live database on 1 Oct 2026, dry-run first.
-- ===============================================================
-- Two halves, from Charlie's ask and Ferron's decision on it:
--
--   The crew can only do their job. They add notes, they tick lines off, they
--   move the stage. They change nothing else.
--
--   The office can go back and fix anything typed in wrong — a bad address,
--   the wrong contact, work described badly, a checklist line that should
--   never have been on there — and every correction is on the record.
--
-- THE TWO HOLES THIS CLOSES. Both were live, both were silent:
--
--   work_order.tech_updates_own is an UPDATE policy whose USING is just
--   "technician AND assigned", and whose WITH CHECK only constrains `stage`.
--   `authenticated` holds UPDATE on every column. So a technician could set
--   invoiced, paid, summary, high_priority, expected_date, even customer_id
--   and site_id, on any job assigned to them, as long as the row ended up in
--   in_progress / waiting_on_product / completed_review. The app never does
--   this — tech.js only ever sends `stage`, through apply_synced_stage — so
--   the policy was pure attack surface.
--
--   scope_item.tech_ticks_scope_own_job is named for ticking but is an UPDATE
--   policy with no column restriction, so a technician could rewrite the text
--   of a quoted line.
--
-- The fix is a guard trigger on each, the same pattern as attachment_guard_hidden
-- in migration 11. The policies themselves stay, because apply_synced_stage is
-- SECURITY INVOKER and needs tech_updates_own to do its UPDATE at all --
-- dropping the policy would stop every "start job" and "finish job" on the
-- phones. The trigger narrows what the policy lets through.
--
-- The office needed no new permission at all: office_writes, office_manages_sites,
-- office_manages_customers and office_manages_scope are all FOR ALL already.
-- What was missing was anywhere in the board to do it from, and any record of
-- it afterwards. office.html now has both.
--
-- Nothing is added to scope_item, note, work_order, site or customer. The
-- history lives in one new table, record_edit, written by one trigger that
-- fits all five.
--
-- DRY RUN, as a technician (Jorge Suarez) on WO-1006, in a transaction that
-- was deliberately aborted:
--   marking the job paid .................. blocked
--   rewriting the job summary ............. blocked
--   apply_synced_stage to completed_review  OK         <- the one that matters
--   rewriting a quoted checklist line ..... blocked
--   ticking a line off .................... OK, and done_by stamped from the
--                                           session even though the client
--                                           deliberately sent null
--   adding a checklist line ............... blocked
-- and as the office (Charlie Amador) on the same job, also aborted:
--   fixing the site address ............... OK
--   summary, priority, expected date ...... OK
--   rewording and adding a checklist line . OK
--   all seven edits visible in work_order_history, with his name on each
--
-- REPLAYING THIS FILE: the `drop ... if exists` lines below were not part of
-- the original run. The Supabase MCP tool holds DROP for a human confirmation
-- a non-interactive session cannot give, so the objects were created without
-- them. They are here so the file can be re-run by hand.

begin;

-- ---------------------------------------------------------------
-- 1. The crew's lane on work_order: stage, and nothing else.
-- ---------------------------------------------------------------
-- apply_synced_stage sets stage and updated_at; the existing BEFORE trigger
-- work_order_stage_set stamps stage_changed_by and updated_at. Those three are
-- the whole legitimate surface.
create or replace function work_order_guard_crew() returns trigger
language plpgsql security invoker set search_path = public as $$
declare
  o jsonb := to_jsonb(old);
  n jsonb := to_jsonb(new);
  k text;
begin
  if current_user in ('postgres','service_role','supabase_admin') then return new; end if;
  if not current_role_is('technician') then return new; end if;

  for k in select jsonb_object_keys(n) loop
    if k in ('stage','updated_at','stage_changed_by') then continue; end if;
    if (o->>k) is distinct from (n->>k) then
      raise exception 'The crew can only move a job forward. % is the office''s to change.', k
        using errcode = '42501';
    end if;
  end loop;
  return new;
end $$;

drop trigger if exists work_order_guard_crew on work_order;
create trigger work_order_guard_crew before update on work_order
  for each row execute function work_order_guard_crew();

-- ---------------------------------------------------------------
-- 2. The crew's lane on scope_item: tick it off, and nothing else.
-- ---------------------------------------------------------------
-- There is still no INSERT policy and no DELETE policy on scope_item, so RLS
-- default-denies both for the crew. Adding or removing a line stays the
-- office's. This trigger covers the UPDATE side, and takes the tick's
-- attribution from the session rather than from what the phone sent.
create or replace function scope_item_guard_crew() returns trigger
language plpgsql security invoker set search_path = public as $$
declare
  me uuid := current_app_user_id();
  o  jsonb := to_jsonb(old);
  n  jsonb;
  k  text;
begin
  if new.done is distinct from old.done and me is not null then
    new.done_by := case when new.done then me else null end;
    new.done_at := case when new.done then now() else null end;
  end if;

  if current_user in ('postgres','service_role','supabase_admin') then return new; end if;
  if not current_role_is('technician') then return new; end if;

  n := to_jsonb(new);
  for k in select jsonb_object_keys(n) loop
    if k in ('done','done_by','done_at') then continue; end if;
    if (o->>k) is distinct from (n->>k) then
      raise exception 'The crew can only tick a line off. Ask the office to change the work order.'
        using errcode = '42501';
    end if;
  end loop;
  return new;
end $$;

drop trigger if exists scope_item_guard_crew on scope_item;
create trigger scope_item_guard_crew before update on scope_item
  for each row execute function scope_item_guard_crew();

-- ---------------------------------------------------------------
-- 3. One history table for everything on a job.
-- ---------------------------------------------------------------
-- One row per field that changed. The actor's name is copied in on purpose:
-- an audit row should still read correctly after someone is renamed or
-- deactivated, and it saves the reader a join.
--
-- work_order_id is null for site and customer edits, because one address
-- belongs to every job at that site. The work_order_history view below
-- resolves those back onto each job.
create table if not exists record_edit (
  id              uuid primary key default gen_random_uuid(),
  work_order_id   uuid references work_order(id) on delete cascade,
  entity          text not null,
  entity_id       uuid,
  action          text not null check (action in ('added','changed','deleted')),
  field           text,
  value_before    text,
  value_after     text,
  changed_by      uuid references app_user(id),
  changed_by_name text,
  changed_at      timestamptz not null default now()
);

create index if not exists record_edit_wo_idx     on record_edit (work_order_id, changed_at desc);
create index if not exists record_edit_entity_idx on record_edit (entity, entity_id, changed_at desc);

alter table record_edit enable row level security;

-- Office only. The history carries money fields (invoiced, paid) and customer
-- contact details, so it is not crew-visible. Notes stay crew-visible as they
-- are; this is the audit trail, not the conversation.
drop policy if exists office_reads_record_edit on record_edit;
create policy office_reads_record_edit on record_edit
  for select using (current_role_is('owner') or current_role_is('office'));

-- Nobody writes this by hand. The trigger is SECURITY DEFINER and so needs no
-- INSERT policy; without these revokes `authenticated` could forge audit rows.
revoke insert, update, delete on record_edit from anon, authenticated;

-- ---------------------------------------------------------------
-- 4. The writer. One function, five tables.
-- ---------------------------------------------------------------
create or replace function log_record_edit() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  actor uuid := current_app_user_id();
  who   text;
  wo    uuid;
  o     jsonb;
  n     jsonb;
  k     text;
  label text;
  -- Housekeeping and robot columns. The translation worker writes every *_es
  -- column and the transcribe/translate/upload state fields; none of that is
  -- a person changing something, and logging it would bury what is.
  skip  text[] := array[
    'id','created_at','created_by','updated_at','client_created_at','stage_changed_by',
    'translate_state','translate_attempts','translate_error','translated_at',
    'translated_lang','translated_body','transcribe_state',
    'upload_status','upload_attempts','uploaded_at',
    'done_by','done_at','hidden_by'
  ];
begin
  o := case when tg_op = 'INSERT' then '{}'::jsonb else to_jsonb(old) end;
  n := case when tg_op = 'DELETE' then '{}'::jsonb else to_jsonb(new) end;

  select full_name into who from app_user where id = actor;
  who := coalesce(who, 'System');

  wo := case tg_table_name
          when 'work_order' then coalesce((n->>'id')::uuid, (o->>'id')::uuid)
          when 'site'       then null
          when 'customer'   then null
          else coalesce((n->>'work_order_id')::uuid, (o->>'work_order_id')::uuid)
        end;

  if tg_op = 'DELETE' then
    label := coalesce(o->>'body', o->>'original_body', o->>'summary', o->>'label', o->>'name');
    insert into record_edit (work_order_id, entity, entity_id, action, value_before, changed_by, changed_by_name)
      values (wo, tg_table_name, (o->>'id')::uuid, 'deleted', label, actor, who);
    return null;
  end if;

  if tg_op = 'INSERT' then
    label := coalesce(n->>'body', n->>'original_body', n->>'summary', n->>'label', n->>'name');
    insert into record_edit (work_order_id, entity, entity_id, action, value_after, changed_by, changed_by_name)
      values (wo, tg_table_name, (n->>'id')::uuid, 'added', label, actor, who);
    return null;
  end if;

  for k in select jsonb_object_keys(n) loop
    if k = any(skip) then continue; end if;
    if right(k, 3) = '_es' then continue; end if;
    -- Stage history already lives in stage_event; the view below unions it in
    -- rather than keeping two copies of the same truth.
    if tg_table_name = 'work_order' and k = 'stage' then continue; end if;
    if (o->>k) is distinct from (n->>k) then
      insert into record_edit (work_order_id, entity, entity_id, action, field,
                               value_before, value_after, changed_by, changed_by_name)
        values (wo, tg_table_name, (n->>'id')::uuid, 'changed', k,
                o->>k, n->>k, actor, who);
    end if;
  end loop;
  return null;
end $$;

-- UPDATE and DELETE everywhere; INSERT only where a row appearing later is
-- itself the news. A work order, site, customer or note appearing is already
-- recorded by its own created_at, and logging every crew note twice would
-- drown the trail.
drop trigger if exists log_record_edit on work_order;
create trigger log_record_edit after update or delete on work_order
  for each row execute function log_record_edit();

drop trigger if exists log_record_edit on site;
create trigger log_record_edit after update or delete on site
  for each row execute function log_record_edit();

drop trigger if exists log_record_edit on customer;
create trigger log_record_edit after update or delete on customer
  for each row execute function log_record_edit();

drop trigger if exists log_record_edit on scope_item;
create trigger log_record_edit after insert or update or delete on scope_item
  for each row execute function log_record_edit();

drop trigger if exists log_record_edit on note;
create trigger log_record_edit after update or delete on note
  for each row execute function log_record_edit();

-- Migration 12's lesson: a new function is EXECUTE TO PUBLIC by default.
-- Postgres does not check EXECUTE on a trigger function, but spell it out so
-- none of these shows up as anon-callable in the next audit.
revoke execute on function log_record_edit()        from public, anon;
revoke execute on function work_order_guard_crew()  from public, anon;
revoke execute on function scope_item_guard_crew()  from public, anon;
grant  execute on function log_record_edit()        to authenticated, service_role;
grant  execute on function work_order_guard_crew()  to authenticated, service_role;
grant  execute on function scope_item_guard_crew()  to authenticated, service_role;

-- ---------------------------------------------------------------
-- 5. One timeline per job, for the office board's History panel.
-- ---------------------------------------------------------------
-- Resolves site and customer edits onto every job that shares them, and folds
-- in the stage history that stage_event already keeps.
create or replace view work_order_history as
  select w.id          as work_order_id,
         e.changed_at,
         e.changed_by,
         e.changed_by_name,
         e.entity,
         e.entity_id,
         e.action,
         e.field,
         e.value_before,
         e.value_after
    from work_order w
    join record_edit e
      on  e.work_order_id = w.id
      or (e.entity = 'site'     and e.entity_id = w.site_id)
      or (e.entity = 'customer' and e.entity_id = w.customer_id)
  union all
  select s.work_order_id,
         s.changed_at,
         s.changed_by,
         coalesce(u.full_name, 'System'),
         'work_order',
         s.work_order_id,
         'changed',
         'stage',
         s.from_stage::text,
         s.to_stage::text
    from stage_event s
    left join app_user u on u.id = s.changed_by;

alter view work_order_history set (security_invoker = on);
grant select on work_order_history to authenticated;

commit;
