-- ===============================================================
-- Worldwide Distributors Inc. — migration 02b: stage trigger fix
-- Run AFTER 02-auth-users.sql. Already applied to the live project.
-- ===============================================================
--
-- The original log_stage_change was a single BEFORE trigger that
-- inserted the stage_event row. On INSERT that ran before the work
-- order row existed, so the history row had nothing to reference.
-- Split in two: BEFORE stamps who and when, AFTER writes history.
-- Both are security definer so a technician's session can fire them.

drop trigger if exists work_order_stage_log on work_order;

create or replace function log_stage_change_before() returns trigger as $fn$
begin
  if tg_op = 'INSERT' or new.stage is distinct from old.stage then
    new.stage_changed_by := current_app_user_id();
  end if;
  new.updated_at := now();
  return new;
end;
$fn$ language plpgsql security definer;

create or replace function log_stage_change_after() returns trigger as $fn$
begin
  if tg_op = 'INSERT' then
    insert into stage_event (work_order_id, from_stage, to_stage, changed_by)
    values (new.id, null, new.stage, new.stage_changed_by);
  elsif new.stage is distinct from old.stage then
    insert into stage_event (work_order_id, from_stage, to_stage, changed_by)
    values (new.id, old.stage, new.stage, new.stage_changed_by);
  end if;
  return null;
end;
$fn$ language plpgsql security definer;

create trigger work_order_stage_set
  before insert or update on work_order
  for each row execute function log_stage_change_before();

create trigger work_order_stage_log
  after insert or update on work_order
  for each row execute function log_stage_change_after();
