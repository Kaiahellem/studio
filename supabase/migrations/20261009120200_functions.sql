-- Process engine and RPCs needed from milestone 1 onwards.
-- Client-facing transitions (submit_approval, submit_form, register_upload, ...) arrive in milestone 4.

-- ---------------------------------------------------------------------------
-- Process engine
-- ---------------------------------------------------------------------------

-- Moves a project forward after a step changes: completes phases whose steps are all
-- done/skipped, activates the next phase, and activates steps according to step_mode
-- (sequential: one at a time, parallel: all at once). See docs/PLAN.md §6.1.
create function private.advance_project(p_project_id uuid) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_phase public.project_phases;
begin
  loop
    select * into v_phase
    from public.project_phases
    where project_id = p_project_id and status <> 'done'
    order by position
    limit 1;

    exit when not found;

    if v_phase.status = 'pending' then
      update public.project_phases set status = 'active' where id = v_phase.id;
      if v_phase.step_mode = 'parallel' then
        update public.project_steps
        set status = 'active', activated_at = now()
        where phase_id = v_phase.id and status = 'pending';
      end if;
    end if;

    if not exists (
      select 1 from public.project_steps
      where phase_id = v_phase.id and status in ('pending', 'active')
    ) then
      update public.project_phases set status = 'done' where id = v_phase.id;
      continue;
    end if;

    if not exists (
      select 1 from public.project_steps where phase_id = v_phase.id and status = 'active'
    ) then
      update public.project_steps
      set status = 'active', activated_at = now()
      where id = (
        select id from public.project_steps
        where phase_id = v_phase.id and status = 'pending'
        order by position
        limit 1
      );
    end if;

    exit;
  end loop;
end;
$$;
revoke execute on function private.advance_project(uuid) from public;
-- Called from the security-invoker admin RPCs below; `private` is not exposed through the API.
grant execute on function private.advance_project(uuid) to authenticated, service_role;

create function private.require_admin() returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  if not (private.is_admin() or current_user = 'service_role') then
    raise exception 'admin only' using errcode = 'insufficient_privilege';
  end if;
end;
$$;
revoke execute on function private.require_admin() from public;
grant execute on function private.require_admin() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Admin RPCs
-- ---------------------------------------------------------------------------

-- Creates a project by copying the template's phases and steps.
create function public.create_project_from_template(
  p_client_id uuid,
  p_template_id uuid,
  p_name text,
  p_start_date date default null,
  p_target_launch_date date default null
) returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_project_id uuid;
  v_template_phase public.template_phases;
  v_phase_id uuid;
begin
  perform private.require_admin();

  insert into public.projects (client_id, template_id, name, start_date, target_launch_date)
  values (p_client_id, p_template_id, p_name, p_start_date, p_target_launch_date)
  returning id into v_project_id;

  for v_template_phase in
    select * from public.template_phases where template_id = p_template_id order by position
  loop
    insert into public.project_phases (project_id, template_phase_id, position, name, description, step_mode)
    values (
      v_project_id, v_template_phase.id, v_template_phase.position, v_template_phase.name,
      v_template_phase.description, v_template_phase.step_mode
    )
    returning id into v_phase_id;

    insert into public.project_steps (
      project_id, phase_id, template_step_id, position, title, description, owner, type,
      visible_to_client, max_revision_rounds, form_definition_id, config, due_date
    )
    select
      v_project_id, v_phase_id, ts.id, ts.position, ts.title, ts.description, ts.owner, ts.type,
      ts.visible_to_client, ts.max_revision_rounds, ts.form_definition_id, ts.config,
      case when p_start_date is not null and ts.due_offset_days is not null
        then p_start_date + ts.due_offset_days end
    from public.template_steps ts
    where ts.phase_id = v_template_phase.id;
  end loop;

  insert into public.site_details (project_id) values (v_project_id);

  insert into public.activity_log (client_id, project_id, actor_id, event, entity_type, entity_id, data)
  values (
    p_client_id, v_project_id, auth.uid(), 'project.created', 'project', v_project_id,
    jsonb_build_object('template_id', p_template_id)
  );

  perform private.advance_project(v_project_id);
  return v_project_id;
end;
$$;
revoke execute on function public.create_project_from_template(uuid, uuid, text, date, date) from public, anon;
grant execute on function public.create_project_from_template(uuid, uuid, text, date, date) to authenticated, service_role;

-- Marks a step done (or skipped) and moves the project forward.
create function public.complete_step(p_step_id uuid, p_skip boolean default false) returns void
language plpgsql
set search_path = ''
as $$
declare
  v_step public.project_steps;
  v_client_id uuid;
begin
  perform private.require_admin();

  select * into v_step from public.project_steps where id = p_step_id for update;
  if not found then
    raise exception 'step not found' using errcode = 'no_data_found';
  end if;
  if v_step.status in ('done', 'skipped') then
    return;
  end if;

  update public.project_steps
  set status = case when p_skip then 'skipped'::public.step_status else 'done'::public.step_status end,
      completed_at = now(),
      completed_by = auth.uid()
  where id = p_step_id;

  select client_id into v_client_id from public.projects where id = v_step.project_id;

  insert into public.activity_log (client_id, project_id, actor_id, event, entity_type, entity_id)
  values (
    v_client_id, v_step.project_id, auth.uid(),
    case when p_skip then 'step.skipped' else 'step.completed' end,
    'project_step', p_step_id
  );

  perform private.advance_project(v_step.project_id);
end;
$$;
revoke execute on function public.complete_step(uuid, boolean) from public, anon;
grant execute on function public.complete_step(uuid, boolean) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Maintenance usage (clients see totals only, never time entry details)
-- ---------------------------------------------------------------------------

-- Minutes used in a calendar month (Europe/Oslo): maintenance log entries plus change
-- requests billed as `included`. See docs/PLAN.md §2 and §6.3.
create function public.agreement_usage(p_agreement_id uuid, p_month date default null)
returns table (used_minutes integer, included_minutes integer, month date)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_agreement public.maintenance_agreements;
  v_month date := date_trunc('month', coalesce(p_month, (now() at time zone 'Europe/Oslo')::date))::date;
begin
  select * into v_agreement from public.maintenance_agreements where id = p_agreement_id;
  if not found or not (private.is_admin() or private.is_member(v_agreement.client_id)) then
    return;
  end if;

  return query
  select
    coalesce(sum(t.minutes), 0)::integer,
    coalesce(v_agreement.minutes_override, p.included_minutes_per_month),
    v_month
  from public.maintenance_plans p
  left join public.time_entries t
    on t.entry_date >= v_month
   and t.entry_date < (v_month + interval '1 month')::date
   and t.entry_date >= v_agreement.start_date
   and (
     exists (
       select 1 from public.maintenance_log ml
       where ml.id = t.maintenance_log_id and ml.project_id = v_agreement.project_id
     )
     or exists (
       select 1 from public.change_requests cr
       where cr.id = t.change_request_id and cr.project_id = v_agreement.project_id and cr.billing = 'included'
     )
   )
  where p.id = v_agreement.plan_id
  group by p.included_minutes_per_month;
end;
$$;
revoke execute on function public.agreement_usage(uuid, date) from public, anon;
grant execute on function public.agreement_usage(uuid, date) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Public handover link
-- ---------------------------------------------------------------------------

-- Returns the handover page for an enabled public token, or null. Storage paths are
-- included so the route handler can create short-lived signed URLs for exactly these files.
create function public.get_public_handover(p_token text) returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_page public.handover_pages;
begin
  if p_token is null or char_length(p_token) < 32 then
    return null;
  end if;

  select * into v_page
  from public.handover_pages
  where public_token = p_token and public_enabled and published_at is not null;
  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'project', (
      select jsonb_build_object('name', pr.name, 'client_name', c.name, 'live_url', pr.live_url, 'cms_url', pr.cms_url)
      from public.projects pr join public.clients c on c.id = pr.client_id
      where pr.id = v_page.project_id
    ),
    'sections', coalesce((
      select jsonb_agg(
        jsonb_build_object('kind', s.kind, 'title', s.title, 'content', s.content)
        order by s.position
      )
      from public.handover_sections s
      where s.page_id = v_page.id and s.visible
    ), '[]'::jsonb),
    'site', (
      select jsonb_build_object(
        'domain_name', sd.domain_name, 'registrar', sd.registrar, 'domain_owner', sd.domain_owner,
        'domain_renewal_date', sd.domain_renewal_date, 'hosting_provider', sd.hosting_provider,
        'hosting_owner', sd.hosting_owner, 'hosting_renewal_date', sd.hosting_renewal_date,
        'dns_provider', sd.dns_provider, 'email_provider', sd.email_provider
      )
      from public.site_details sd where sd.project_id = v_page.project_id
    ),
    'files', coalesce((
      select jsonb_agg(jsonb_build_object('id', f.id, 'name', f.name, 'mime_type', f.mime_type, 'storage_path', f.storage_path))
      from public.files f
      where f.project_id = v_page.project_id
        and f.visible_to_client
        and f.id::text in (
          select jsonb_array_elements_text(s.content -> 'file_ids')
          from public.handover_sections s
          where s.page_id = v_page.id and s.visible
        )
    ), '[]'::jsonb)
  );
end;
$$;
revoke execute on function public.get_public_handover(text) from public;
grant execute on function public.get_public_handover(text) to anon, authenticated, service_role;
