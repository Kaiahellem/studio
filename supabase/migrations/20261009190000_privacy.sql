-- Milestone 8: GDPR delete and configurable upload limits.

-- Permanently deletes a client with everything that belongs to it (BRIEF.md, Privacy).
-- Approvals and the activity log are otherwise append-only; this is the one sanctioned way
-- to remove them (docs/PLAN.md §3.4). Returns the storage paths and member user ids so the
-- server can delete the files and the auth users afterwards.
create function public.purge_client(p_client_id uuid)
returns table (storage_paths text[], member_ids uuid[])
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_paths text[];
  v_members uuid[];
begin
  if not private.is_admin() then
    raise exception 'admin only' using errcode = 'insufficient_privilege';
  end if;
  if not exists (select 1 from public.clients where id = p_client_id) then
    raise exception 'client not found' using errcode = 'no_data_found';
  end if;

  select coalesce(array_agg(path), '{}') into v_paths from (
    select f.storage_path as path from public.files f where f.client_id = p_client_id
    union
    select d.storage_path from public.documents d
    join public.projects p on p.id = d.project_id
    where p.client_id = p_client_id and d.storage_path is not null
  ) paths;

  -- Members who belong to no other client and are not the studio; their accounts go too.
  select coalesce(array_agg(m.user_id), '{}') into v_members
  from public.client_members m
  where m.client_id = p_client_id
    and not exists (select 1 from public.client_members o where o.user_id = m.user_id and o.client_id <> p_client_id)
    and not exists (select 1 from public.admins a where a.user_id = m.user_id);

  -- Lets the append-only triggers allow deletes, for this transaction only.
  perform set_config('app.purge_client', p_client_id::text, true);

  delete from public.approvals a using public.project_steps s, public.projects p
  where a.step_id = s.id and s.project_id = p.id and p.client_id = p_client_id;
  delete from public.activity_log where client_id = p_client_id;
  delete from public.email_log l
  where l.recipient in (select u.email from auth.users u where u.id = any (v_members));
  delete from public.clients where id = p_client_id;

  return query select v_paths, v_members;
end;
$$;

-- Upload limits live in app_settings and on the storage bucket; both change together.
create function public.update_app_settings(
  p_reminder_after_days integer,
  p_reminder_interval_days integer,
  p_max_upload_bytes bigint,
  p_allowed_mime_types text[]
) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'admin only' using errcode = 'insufficient_privilege';
  end if;
  update public.app_settings set
    reminder_after_days = p_reminder_after_days,
    reminder_interval_days = p_reminder_interval_days,
    max_upload_bytes = p_max_upload_bytes,
    allowed_mime_types = p_allowed_mime_types
  where id;
  update storage.buckets
  set file_size_limit = p_max_upload_bytes, allowed_mime_types = p_allowed_mime_types
  where id = 'project-files';
end;
$$;

revoke execute on function public.purge_client(uuid) from public, anon;
grant execute on function public.purge_client(uuid) to authenticated;
revoke execute on function public.update_app_settings(integer, integer, bigint, text[]) from public, anon;
grant execute on function public.update_app_settings(integer, integer, bigint, text[]) to authenticated;
