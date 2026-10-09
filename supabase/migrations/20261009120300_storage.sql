-- Private bucket for all project files. See docs/PLAN.md §3.3.
-- Path: {client_id}/{project_id}/{uuid}-{slugified-name}
-- Downloads use short-lived signed URLs created on the server.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
select 'project-files', 'project-files', false, s.max_upload_bytes, s.allowed_mime_types
from public.app_settings s
on conflict (id) do nothing;

-- First path segment as a client id, or null if the path is malformed.
create function private.storage_path_client_id(p_name text) returns uuid
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_segment text := split_part(p_name, '/', 1);
begin
  if v_segment ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return v_segment::uuid;
  end if;
  return null;
end;
$$;

create function private.storage_path_project_id(p_name text) returns uuid
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_segment text := split_part(p_name, '/', 2);
begin
  if v_segment ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return v_segment::uuid;
  end if;
  return null;
end;
$$;

-- Mirrors the table policies: an object is readable when a files/documents row that
-- the caller may read points at it.
create function private.can_read_object(p_name text) returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.files f
    where f.storage_path = p_name
      and f.visible_to_client
      and private.is_member(f.client_id)
      and (f.step_id is null or private.can_see_step(f.step_id))
      and (f.change_request_id is null or private.can_see_change_request(f.change_request_id))
  )
  or exists (
    select 1 from public.documents d
    where d.storage_path = p_name
      and d.visible_to_client
      and private.can_see_project(d.project_id)
      and (d.step_id is null or private.can_see_step(d.step_id))
  );
$$;

-- Clients may only upload into a project of their own client.
create function private.can_upload_object(p_name text) returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.projects p
    where p.id = private.storage_path_project_id(p_name)
      and p.client_id = private.storage_path_client_id(p_name)
      and private.is_member(p.client_id)
  );
$$;

revoke execute on function private.storage_path_client_id(text) from public;
revoke execute on function private.storage_path_project_id(text) from public;
revoke execute on function private.can_read_object(text) from public;
revoke execute on function private.can_upload_object(text) from public;
grant execute on function private.storage_path_client_id(text) to authenticated, service_role;
grant execute on function private.storage_path_project_id(text) to authenticated, service_role;
grant execute on function private.can_read_object(text) to authenticated, service_role;
grant execute on function private.can_upload_object(text) to authenticated, service_role;

create policy project_files_select on storage.objects for select to authenticated
  using (
    bucket_id = 'project-files'
    and ((select private.is_admin()) or private.can_read_object(name))
  );

create policy project_files_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'project-files'
    and ((select private.is_admin()) or private.can_upload_object(name))
  );

create policy project_files_update on storage.objects for update to authenticated
  using (bucket_id = 'project-files' and (select private.is_admin()))
  with check (bucket_id = 'project-files' and (select private.is_admin()));

create policy project_files_delete on storage.objects for delete to authenticated
  using (bucket_id = 'project-files' and (select private.is_admin()));
