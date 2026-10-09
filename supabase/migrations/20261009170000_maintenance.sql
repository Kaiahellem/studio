-- Milestone 6: maintenance, change requests, time and the maintenance log.

-- accepted_at / done_at follow the status, whoever changes it.
create function private.change_request_timestamps() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status in ('accepted', 'in_progress', 'waiting_on_client', 'done') and new.accepted_at is null then
    new.accepted_at := now();
  end if;
  if new.status = 'done' and old.status is distinct from 'done' then
    new.done_at := now();
  elsif new.status <> 'done' then
    new.done_at := null;
  end if;
  return new;
end;
$$;
create trigger change_request_timestamps before update of status on public.change_requests
  for each row execute function private.change_request_timestamps();

-- Every request and status change lands in the activity log (and later drives notifications).
create function private.log_change_request() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform private.log_event(new.project_id, 'change_request.created', 'change_request', new.id,
      jsonb_build_object('title', new.title, 'urgency', new.urgency, 'billing', new.billing));
  elsif new.status is distinct from old.status then
    perform private.log_event(new.project_id, 'change_request.status', 'change_request', new.id,
      jsonb_build_object('title', new.title, 'from', old.status, 'to', new.status));
  end if;
  return new;
end;
$$;
create trigger log_change_request after insert or update on public.change_requests
  for each row execute function private.log_change_request();

-- Client attachments on their own open change requests. Same checks as step uploads.
create function public.register_request_upload(
  p_change_request_id uuid, p_storage_path text, p_name text, p_size_bytes bigint, p_mime_type text
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.change_requests;
  v_settings public.app_settings;
  v_id uuid;
begin
  select * into v_request from public.change_requests where id = p_change_request_id;
  if not found or not private.is_member(v_request.client_id) then
    raise exception 'request not available' using errcode = 'insufficient_privilege';
  end if;
  if v_request.status in ('done', 'declined') then
    raise exception 'request is closed' using errcode = 'check_violation';
  end if;

  select * into v_settings from public.app_settings;
  if p_storage_path not like v_request.client_id::text || '/' || v_request.project_id::text || '/requests/%' then
    raise exception 'file is not in this project' using errcode = 'check_violation';
  end if;
  if p_size_bytes > v_settings.max_upload_bytes or not (p_mime_type = any (v_settings.allowed_mime_types)) then
    raise exception 'file not allowed' using errcode = 'check_violation';
  end if;
  if not exists (select 1 from storage.objects o where o.bucket_id = 'project-files' and o.name = p_storage_path) then
    raise exception 'file was not uploaded' using errcode = 'check_violation';
  end if;

  insert into public.files (client_id, project_id, change_request_id, uploaded_by, storage_path, name, size_bytes, mime_type)
  values (v_request.client_id, v_request.project_id, p_change_request_id, auth.uid(), p_storage_path, p_name, p_size_bytes, p_mime_type)
  returning id into v_id;

  perform private.log_event(v_request.project_id, 'file.uploaded', 'file', v_id,
    jsonb_build_object('name', p_name, 'change_request_id', p_change_request_id));
  return v_id;
end;
$$;

-- A maintenance log entry with its time, in one go.
create function public.add_maintenance_log(
  p_project_id uuid,
  p_entry_date date,
  p_title text,
  p_description text default null,
  p_visible_to_client boolean default true,
  p_minutes integer default null
) returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid;
begin
  perform private.require_admin();
  insert into public.maintenance_log (client_id, project_id, entry_date, title, description, visible_to_client, created_by)
  select p.client_id, p.id, p_entry_date, p_title, nullif(trim(p_description), ''), p_visible_to_client, auth.uid()
  from public.projects p where p.id = p_project_id
  returning id into v_id;
  if v_id is null then
    raise exception 'project not found' using errcode = 'no_data_found';
  end if;

  if p_minutes is not null and p_minutes > 0 then
    insert into public.time_entries (maintenance_log_id, entry_date, minutes, description)
    values (v_id, p_entry_date, p_minutes, p_title);
  end if;
  perform private.log_event(p_project_id, 'maintenance.logged', 'maintenance_log', v_id, jsonb_build_object('title', p_title));
  return v_id;
end;
$$;

-- Minutes logged per maintenance log entry, for the client's log. Clients never see time
-- entry rows, only these totals (docs/PLAN.md §3).
create function public.maintenance_log_minutes(p_project_id uuid)
returns table (maintenance_log_id uuid, minutes integer)
language sql
stable
security definer
set search_path = ''
as $$
  select t.maintenance_log_id, sum(t.minutes)::integer
  from public.time_entries t
  join public.maintenance_log ml on ml.id = t.maintenance_log_id
  where ml.project_id = p_project_id
    and (private.is_admin() or (ml.visible_to_client and private.is_member(ml.client_id)))
  group by t.maintenance_log_id;
$$;

-- Minutes per change request, same rule.
create function public.change_request_minutes(p_project_id uuid)
returns table (change_request_id uuid, minutes integer)
language sql
stable
security definer
set search_path = ''
as $$
  select t.change_request_id, sum(t.minutes)::integer
  from public.time_entries t
  join public.change_requests cr on cr.id = t.change_request_id
  where cr.project_id = p_project_id
    and (private.is_admin() or private.is_member(cr.client_id))
  group by t.change_request_id;
$$;

do $$
declare
  f text;
begin
  foreach f in array array[
    'register_request_upload(uuid, text, text, bigint, text)',
    'add_maintenance_log(uuid, date, text, text, boolean, integer)',
    'maintenance_log_minutes(uuid)',
    'change_request_minutes(uuid)'
  ]
  loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated, service_role', f);
  end loop;
end;
$$;
