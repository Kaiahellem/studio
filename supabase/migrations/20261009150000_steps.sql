-- Milestone 4: working through steps. Client transitions run here, in one transaction each:
-- the rule check, the record, the step status, the next step and the activity log.
-- See docs/PLAN.md §3.2 and §6.2.

-- Steps that only the studio may complete even though the client owns them (e.g. "Signer
-- avtalen", which is done when the signature arrives).
update public.template_steps set config = config || '{"client_can_complete": false}'
where title = 'Signer avtalen';
update public.project_steps set config = config || '{"client_can_complete": false}'
where title = 'Signer avtalen';

-- The active, client-visible step the caller may act on, locked for update; raises otherwise.
create function private.client_step(p_step_id uuid, p_types public.step_type[]) returns public.project_steps
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_step public.project_steps;
begin
  select * into v_step from public.project_steps where id = p_step_id for update;
  if not found or not private.can_see_step(p_step_id) then
    raise exception 'step not available' using errcode = 'insufficient_privilege';
  end if;
  if v_step.status <> 'active' then
    raise exception 'step is not active' using errcode = 'check_violation';
  end if;
  if v_step.owner <> 'client' or not (v_step.type = any (p_types)) then
    raise exception 'not a client step of this type' using errcode = 'check_violation';
  end if;
  return v_step;
end;
$$;

create function private.finish_step(p_step public.project_steps) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.project_steps
  set status = 'done', completed_at = now(), completed_by = auth.uid()
  where id = p_step.id;
  perform private.log_event(p_step.project_id, 'step.completed', 'project_step', p_step.id);
  perform private.advance_project(p_step.project_id);
end;
$$;

revoke execute on function private.client_step(uuid, public.step_type[]) from public;
revoke execute on function private.finish_step(public.project_steps) from public;

-- ---------------------------------------------------------------------------
-- Approvals (docs/PLAN.md §6.2)
-- ---------------------------------------------------------------------------

-- Studio shares a version for review. Opens the next round.
create function public.open_approval_round(p_step_id uuid, p_note text default null, p_link text default null)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_step public.project_steps;
  v_round integer;
begin
  perform private.require_admin();
  select * into v_step from public.project_steps where id = p_step_id for update;
  if not found or v_step.type <> 'approval' then
    raise exception 'not an approval step' using errcode = 'check_violation';
  end if;
  if v_step.status <> 'active' then
    raise exception 'step is not active' using errcode = 'check_violation';
  end if;
  if exists (
    select 1 from public.approval_rounds r
    where r.step_id = p_step_id and not exists (select 1 from public.approvals a where a.round_id = r.id)
  ) then
    raise exception 'a round is already open' using errcode = 'check_violation';
  end if;

  v_round := coalesce((select max(round) from public.approval_rounds where step_id = p_step_id), 0) + 1;
  insert into public.approval_rounds (step_id, round, note, link, opened_by)
  values (p_step_id, v_round, nullif(trim(p_note), ''), nullif(trim(p_link), ''), auth.uid());

  perform private.log_event(v_step.project_id, 'approval.round_opened', 'project_step', p_step_id, jsonb_build_object('round', v_round));
  return v_round;
end;
$$;

-- Client approves or asks for changes on the open round.
create function public.submit_approval(p_step_id uuid, p_decision public.approval_decision, p_comment text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_step public.project_steps;
  v_round public.approval_rounds;
  v_comment text := nullif(trim(p_comment), '');
  v_exhausted boolean;
begin
  v_step := private.client_step(p_step_id, array['approval']::public.step_type[]);

  select r.* into v_round
  from public.approval_rounds r
  where r.step_id = p_step_id and not exists (select 1 from public.approvals a where a.round_id = r.id)
  order by r.round desc
  limit 1;
  if not found then
    raise exception 'no open round' using errcode = 'check_violation';
  end if;
  if p_decision = 'changes_requested' and v_comment is null then
    raise exception 'a comment is required when asking for changes' using errcode = 'check_violation';
  end if;

  insert into public.approvals (step_id, round_id, round, user_id, decision, comment)
  values (p_step_id, v_round.id, v_round.round, auth.uid(), p_decision, v_comment);

  perform private.log_event(
    v_step.project_id,
    case when p_decision = 'approved' then 'approval.approved' else 'approval.changes_requested' end,
    'project_step', p_step_id,
    jsonb_build_object('round', v_round.round, 'comment', v_comment)
  );

  -- Changes requested on the last included round: further rounds are billed (notify the studio).
  v_exhausted := p_decision = 'changes_requested'
    and v_step.max_revision_rounds is not null
    and v_round.round >= v_step.max_revision_rounds;
  if v_exhausted then
    perform private.log_event(v_step.project_id, 'approval.rounds_used_up', 'project_step', p_step_id,
      jsonb_build_object('round', v_round.round, 'max', v_step.max_revision_rounds));
  end if;

  if p_decision = 'approved' then
    perform private.finish_step(v_step);
  end if;

  return jsonb_build_object('round', v_round.round, 'rounds_used_up', v_exhausted);
end;
$$;

-- ---------------------------------------------------------------------------
-- Forms
-- ---------------------------------------------------------------------------

-- Submits the client's answers. The question set is snapshotted so the answers stay readable
-- if the form is edited later. Forms bound to site_details also fill that table.
create function public.submit_form(p_step_id uuid, p_answers jsonb) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_step public.project_steps;
  v_definition public.form_definitions;
  v_owner text;
begin
  v_step := private.client_step(p_step_id, array['form']::public.step_type[]);
  if jsonb_typeof(p_answers) <> 'object' then
    raise exception 'answers must be an object' using errcode = 'check_violation';
  end if;
  select * into v_definition from public.form_definitions where id = v_step.form_definition_id;

  insert into public.form_responses (step_id, answers, status, definition_snapshot, submitted_at, submitted_by, updated_by)
  values (p_step_id, p_answers, 'submitted', v_definition.schema, now(), auth.uid(), auth.uid())
  on conflict (step_id) do update
  set answers = excluded.answers, status = 'submitted', definition_snapshot = excluded.definition_snapshot,
      submitted_at = excluded.submitted_at, submitted_by = excluded.submitted_by, updated_by = excluded.updated_by;

  if v_definition.binding = 'site_details' then
    v_owner := p_answers ->> 'domain_owner';
    update public.site_details set
      domain_name = coalesce(nullif(trim(p_answers ->> 'domain_name'), ''), domain_name),
      registrar = coalesce(nullif(trim(p_answers ->> 'registrar'), ''), registrar),
      domain_owner = case when v_owner in ('client', 'studio') then v_owner::public.party else domain_owner end,
      email_provider = coalesce(nullif(trim(p_answers ->> 'email_provider'), ''), email_provider),
      dns_provider = coalesce(nullif(trim(p_answers ->> 'dns_provider'), ''), dns_provider),
      access_notes = coalesce(nullif(trim(p_answers ->> 'access_notes'), ''), access_notes),
      hosting_provider = coalesce(nullif(trim(p_answers ->> 'hosting_provider'), ''), hosting_provider),
      google_business_profile_url = case
        when p_answers ->> 'google_business_profile_url' ~* '^https?://\S+$' then p_answers ->> 'google_business_profile_url'
        else google_business_profile_url end,
      updated_by = auth.uid()
    where project_id = v_step.project_id;
  end if;

  perform private.log_event(v_step.project_id, 'form.submitted', 'project_step', p_step_id);
  perform private.finish_step(v_step);
end;
$$;

-- ---------------------------------------------------------------------------
-- Uploads
-- ---------------------------------------------------------------------------

-- Registers a file the client uploaded through a signed URL. The path must sit in the
-- step's own project folder, and size and type must match the studio's settings.
create function public.register_upload(
  p_step_id uuid, p_storage_path text, p_name text, p_size_bytes bigint, p_mime_type text
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_step public.project_steps;
  v_client_id uuid;
  v_settings public.app_settings;
  v_id uuid;
begin
  v_step := private.client_step(p_step_id, array['upload']::public.step_type[]);
  select client_id into v_client_id from public.projects where id = v_step.project_id;
  select * into v_settings from public.app_settings;

  if p_storage_path not like v_client_id::text || '/' || v_step.project_id::text || '/%' then
    raise exception 'file is not in this project' using errcode = 'check_violation';
  end if;
  if p_size_bytes > v_settings.max_upload_bytes or not (p_mime_type = any (v_settings.allowed_mime_types)) then
    raise exception 'file not allowed' using errcode = 'check_violation';
  end if;
  if not exists (select 1 from storage.objects o where o.bucket_id = 'project-files' and o.name = p_storage_path) then
    raise exception 'file was not uploaded' using errcode = 'check_violation';
  end if;

  insert into public.files (client_id, project_id, step_id, uploaded_by, storage_path, name, size_bytes, mime_type)
  values (v_client_id, v_step.project_id, p_step_id, auth.uid(), p_storage_path, p_name, p_size_bytes, p_mime_type)
  returning id into v_id;

  perform private.log_event(v_step.project_id, 'file.uploaded', 'file', v_id, jsonb_build_object('name', p_name, 'step_id', p_step_id));
  return v_id;
end;
$$;

-- A client may remove their own upload while the step is still open. Returns the storage
-- path so the server can delete the object (storage deletes are admin-only).
create function public.remove_own_upload(p_file_id uuid) returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_file public.files;
begin
  select * into v_file from public.files where id = p_file_id for update;
  if not found or v_file.uploaded_by is distinct from auth.uid() or v_file.step_id is null then
    raise exception 'file not available' using errcode = 'insufficient_privilege';
  end if;
  perform private.client_step(v_file.step_id, array['upload']::public.step_type[]);

  delete from public.files where id = p_file_id;
  perform private.log_event(v_file.project_id, 'file.removed', 'file', p_file_id, jsonb_build_object('name', v_file.name));
  return v_file.storage_path;
end;
$$;

-- ---------------------------------------------------------------------------
-- Completing client tasks, uploads and links
-- ---------------------------------------------------------------------------

create function public.complete_client_step(p_step_id uuid) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_step public.project_steps;
begin
  v_step := private.client_step(p_step_id, array['task', 'upload', 'link']::public.step_type[]);
  if coalesce((v_step.config ->> 'client_can_complete')::boolean, true) = false then
    raise exception 'the studio completes this step' using errcode = 'check_violation';
  end if;
  perform private.finish_step(v_step);
end;
$$;

-- ---------------------------------------------------------------------------
-- Comments are logged, whoever writes them
-- ---------------------------------------------------------------------------

create function private.log_comment() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.log_event(
    new.project_id, case when new.internal then 'comment.internal' else 'comment.added' end, 'comment', new.id,
    jsonb_build_object('step_id', new.step_id, 'change_request_id', new.change_request_id)
  );
  return new;
end;
$$;
create trigger log_comment after insert on public.comments
  for each row execute function private.log_comment();

do $$
declare
  f text;
begin
  foreach f in array array[
    'open_approval_round(uuid, text, text)',
    'submit_approval(uuid, public.approval_decision, text)',
    'submit_form(uuid, jsonb)',
    'register_upload(uuid, text, text, bigint, text)',
    'remove_own_upload(uuid)',
    'complete_client_step(uuid)'
  ]
  loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated, service_role', f);
  end loop;
end;
$$;
