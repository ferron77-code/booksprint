-- ===============================================================
-- Worldwide Distributors Inc. — migration 10: crew helper hours
-- APPLIED to the live database on 22 Sep 2026.
-- ===============================================================
-- Crew lead enters helper hours at closeout (client's choice, Option A).
-- A technician on the job may set hours on ANY helper on that job, including
-- ones the office added; he may rename only helpers he added himself, and
-- never move a helper to a job he is not on.
-- (Also applied earlier: 06 job numbering, 07 note remove/restore,
--  08 helper hours by office, 09 storage sweep schedule.)

drop policy if exists tech_amends_own_helper on job_helper;
drop policy if exists tech_sets_helper_hours on job_helper;
create policy tech_sets_helper_hours on job_helper for update
  using (current_role_is('technician') and is_assigned_to(work_order_id))
  with check (current_role_is('technician') and is_assigned_to(work_order_id));

create or replace function job_helper_guard() returns trigger language plpgsql as $$
declare me uuid;
begin
  if current_role_is('technician') then
    select id into me from app_user where auth_id = auth.uid();
    if new.work_order_id is distinct from old.work_order_id or new.recorded_by is distinct from old.recorded_by then
      raise exception 'Crew cannot move a helper to another job' using errcode = '42501';
    end if;
    if old.recorded_by is distinct from me
       and (new.full_name is distinct from old.full_name or new.company is distinct from old.company
            or new.is_subcontractor is distinct from old.is_subcontractor or new.job_visit_id is distinct from old.job_visit_id) then
      raise exception 'Crew can only enter hours for a helper the office added' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists job_helper_guard on job_helper;
create trigger job_helper_guard before update on job_helper for each row execute function job_helper_guard();
