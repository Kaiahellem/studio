-- Milestone 2: editing a project's phases and steps, and dashboard data.
-- Reordering and structural changes run as RPCs so they are atomic: positions are swapped
-- inside one transaction (the unique position constraints are deferred), and the process
-- engine runs afterwards.

create function private.log_event(
  p_project_id uuid, p_event text, p_entity_type text, p_entity_id uuid, p_data jsonb default '{}'
) returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.activity_log (client_id, project_id, actor_id, event, entity_type, entity_id, data)
  select p.client_id, p.id, auth.uid(), p_event, p_entity_type, p_entity_id, p_data
  from public.projects p where p.id = p_project_id;
$$;
revoke execute on function private.log_event(uuid, text, text, uuid, jsonb) from public;
grant execute on function private.log_event(uuid, text, text, uuid, jsonb) to authenticated, service_role;

-- Re-runs the process engine, e.g. after steps were edited.
create function public.sync_project(p_project_id uuid) returns void
language plpgsql
set search_path = ''
as $$
begin
  perform private.require_admin();
  perform private.advance_project(p_project_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- Phases
-- ---------------------------------------------------------------------------

create function public.add_phase(
  p_project_id uuid, p_name text, p_description text default null, p_step_mode public.step_mode default 'sequential'
) returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid;
begin
  perform private.require_admin();
  insert into public.project_phases (project_id, position, name, description, step_mode)
  values (
    p_project_id,
    coalesce((select max(position) from public.project_phases where project_id = p_project_id), 0) + 1,
    p_name, p_description, p_step_mode
  )
  returning id into v_id;
  return v_id;
end;
$$;

create function public.move_phase(p_phase_id uuid, p_direction integer) returns void
language plpgsql
set search_path = ''
as $$
declare
  v_phase public.project_phases;
  v_other public.project_phases;
begin
  perform private.require_admin();
  select * into v_phase from public.project_phases where id = p_phase_id for update;
  if not found then raise exception 'phase not found' using errcode = 'no_data_found'; end if;

  select * into v_other from public.project_phases
  where project_id = v_phase.project_id
    and case when p_direction < 0 then position < v_phase.position else position > v_phase.position end
  order by case when p_direction < 0 then -position else position end
  limit 1
  for update;
  if not found then return; end if;

  update public.project_phases set position = v_other.position where id = v_phase.id;
  update public.project_phases set position = v_phase.position where id = v_other.id;
end;
$$;

-- Deleting a phase with approvals fails (approvals are permanent); skip its steps instead.
create function public.delete_phase(p_phase_id uuid) returns void
language plpgsql
set search_path = ''
as $$
declare
  v_project_id uuid;
begin
  perform private.require_admin();
  delete from public.project_phases where id = p_phase_id returning project_id into v_project_id;
  if v_project_id is null then return; end if;
  perform private.log_event(v_project_id, 'phase.deleted', 'project_phase', p_phase_id);
  perform private.advance_project(v_project_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- Steps
-- ---------------------------------------------------------------------------

create function public.add_step(
  p_phase_id uuid,
  p_title text,
  p_owner public.step_owner,
  p_type public.step_type,
  p_visible_to_client boolean default true,
  p_description text default null,
  p_max_revision_rounds integer default null,
  p_form_definition_id uuid default null,
  p_due_date date default null
) returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_project_id uuid;
  v_id uuid;
begin
  perform private.require_admin();
  select project_id into v_project_id from public.project_phases where id = p_phase_id;
  if v_project_id is null then raise exception 'phase not found' using errcode = 'no_data_found'; end if;

  insert into public.project_steps (
    project_id, phase_id, position, title, description, owner, type, visible_to_client,
    max_revision_rounds, form_definition_id, due_date
  ) values (
    v_project_id, p_phase_id,
    coalesce((select max(position) from public.project_steps where phase_id = p_phase_id), 0) + 1,
    p_title, p_description, p_owner, p_type, p_visible_to_client,
    case when p_type = 'approval' then p_max_revision_rounds end,
    case when p_type = 'form' then p_form_definition_id end,
    p_due_date
  )
  returning id into v_id;

  perform private.log_event(v_project_id, 'step.added', 'project_step', v_id, jsonb_build_object('title', p_title));

  -- A step added to an active parallel phase should be active right away.
  update public.project_steps s
  set status = 'active', activated_at = now()
  from public.project_phases ph
  where s.id = v_id and ph.id = s.phase_id and ph.status = 'active' and ph.step_mode = 'parallel';

  -- A step added to a phase that was already done reopens it.
  update public.project_phases set status = 'active'
  where id = p_phase_id and status = 'done';

  perform private.advance_project(v_project_id);
  return v_id;
end;
$$;

create function public.move_step(p_step_id uuid, p_direction integer) returns void
language plpgsql
set search_path = ''
as $$
declare
  v_step public.project_steps;
  v_other public.project_steps;
begin
  perform private.require_admin();
  select * into v_step from public.project_steps where id = p_step_id for update;
  if not found then raise exception 'step not found' using errcode = 'no_data_found'; end if;

  select * into v_other from public.project_steps
  where phase_id = v_step.phase_id
    and case when p_direction < 0 then position < v_step.position else position > v_step.position end
  order by case when p_direction < 0 then -position else position end
  limit 1
  for update;
  if not found then return; end if;

  update public.project_steps set position = v_other.position where id = v_step.id;
  update public.project_steps set position = v_step.position where id = v_other.id;
end;
$$;

-- Deleting a step with approvals fails (approvals are permanent); skip it instead.
create function public.delete_step(p_step_id uuid) returns void
language plpgsql
set search_path = ''
as $$
declare
  v_step public.project_steps;
begin
  perform private.require_admin();
  delete from public.project_steps where id = p_step_id returning * into v_step;
  if v_step.id is null then return; end if;
  perform private.log_event(v_step.project_id, 'step.deleted', 'project_step', p_step_id, jsonb_build_object('title', v_step.title));
  perform private.advance_project(v_step.project_id);
end;
$$;

-- Undo a step marked done or skipped by mistake. Its phase becomes active again.
create function public.reopen_step(p_step_id uuid) returns void
language plpgsql
set search_path = ''
as $$
declare
  v_step public.project_steps;
begin
  perform private.require_admin();
  update public.project_steps
  set status = 'active', activated_at = now(), completed_at = null, completed_by = null
  where id = p_step_id and status in ('done', 'skipped')
  returning * into v_step;
  if v_step.id is null then return; end if;

  update public.project_phases set status = 'active' where id = v_step.phase_id;
  perform private.log_event(v_step.project_id, 'step.reopened', 'project_step', p_step_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- Dashboard
-- ---------------------------------------------------------------------------

-- Hours used this month for every active agreement. Admin only.
create function public.agreements_usage_overview(p_month date default null)
returns table (agreement_id uuid, client_id uuid, client_name text, used_minutes integer, included_minutes integer)
language plpgsql
stable
set search_path = ''
as $$
begin
  perform private.require_admin();
  return query
  select a.id, c.id, c.name, u.used_minutes, u.included_minutes
  from public.maintenance_agreements a
  join public.clients c on c.id = a.client_id
  cross join lateral public.agreement_usage(a.id, p_month) u
  where a.status = 'active'
  order by c.name;
end;
$$;

do $$
declare
  f text;
begin
  foreach f in array array[
    'sync_project(uuid)',
    'add_phase(uuid, text, text, public.step_mode)',
    'move_phase(uuid, integer)',
    'delete_phase(uuid)',
    'add_step(uuid, text, public.step_owner, public.step_type, boolean, text, integer, uuid, date)',
    'move_step(uuid, integer)',
    'delete_step(uuid)',
    'reopen_step(uuid)',
    'agreements_usage_overview(date)'
  ]
  loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated, service_role', f);
  end loop;
end;
$$;
