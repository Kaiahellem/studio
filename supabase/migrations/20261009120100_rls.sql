-- Row Level Security. See docs/PLAN.md §3.
--
-- Rules of thumb:
-- * RLS is enabled on every table; nothing is granted to `anon`.
-- * Admin = row in `admins` AND an aal2 session (TOTP verified).
-- * Clients only read rows for their own client organisation, and only content marked visible.
-- * Client state transitions (approve, submit form, register upload) go through RPCs, not direct writes.
-- * Helper functions live in the `private` schema, which is not exposed through the API.

grant usage on schema private to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Helper functions
-- ---------------------------------------------------------------------------

create function private.is_admin() returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins a where a.user_id = (select auth.uid()))
     and coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2';
$$;

create function private.is_member(p_client_id uuid) returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.client_members m
    where m.client_id = p_client_id and m.user_id = (select auth.uid())
  );
$$;

create function private.can_see_project(p_project_id uuid) returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.projects p
    join public.client_members m on m.client_id = p.client_id
    where p.id = p_project_id and m.user_id = (select auth.uid())
  );
$$;

create function private.can_see_step(p_step_id uuid) returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.project_steps s
    join public.projects p on p.id = s.project_id
    join public.client_members m on m.client_id = p.client_id
    where s.id = p_step_id
      and s.visible_to_client
      and m.user_id = (select auth.uid())
  );
$$;

create function private.can_see_change_request(p_change_request_id uuid) returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.change_requests cr
    join public.client_members m on m.client_id = cr.client_id
    where cr.id = p_change_request_id and m.user_id = (select auth.uid())
  );
$$;

create function private.can_see_form_definition(p_definition_id uuid) returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.project_steps s
    where s.form_definition_id = p_definition_id and private.can_see_step(s.id)
  );
$$;

create function private.can_see_handover_page(p_page_id uuid) returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.handover_pages h
    where h.id = p_page_id and h.published_at is not null and private.can_see_project(h.project_id)
  );
$$;

create function private.can_see_plan(p_plan_id uuid) returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.maintenance_agreements a
    where a.plan_id = p_plan_id and private.is_member(a.client_id)
  );
$$;

-- Clients may see the names of people in their own organisation and of the studio.
create function private.can_see_profile(p_user_id uuid) returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_user_id = (select auth.uid())
      or exists (select 1 from public.admins a where a.user_id = p_user_id)
      or exists (
        select 1
        from public.client_members me
        join public.client_members other on other.client_id = me.client_id
        where me.user_id = (select auth.uid()) and other.user_id = p_user_id
      );
$$;

-- Used by the app to route an admin to MFA before they have an aal2 session.
-- Only ever answers for the caller, so it leaks nothing.
create function public.is_admin_account() returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins a where a.user_id = (select auth.uid()));
$$;

revoke execute on all functions in schema private from public;
grant execute on all functions in schema private to authenticated, service_role;
revoke execute on function public.is_admin_account() from public, anon;
grant execute on function public.is_admin_account() to authenticated;

-- ---------------------------------------------------------------------------
-- Grants: nothing for anon, RLS decides for authenticated
-- ---------------------------------------------------------------------------

revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
-- Functions: each RPC revokes execute from public/anon explicitly where it is created.

-- Records nobody edits through the API.
revoke update, delete, truncate on public.approvals from authenticated;
revoke update, delete, truncate on public.activity_log from authenticated;

-- ---------------------------------------------------------------------------
-- Enable RLS everywhere
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin: full access (except the append-only records, handled below)
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'admins', 'profiles', 'clients', 'client_private', 'client_members',
    'form_definitions', 'process_templates', 'template_phases', 'template_steps',
    'projects', 'project_phases', 'project_steps', 'approval_rounds', 'form_responses',
    'maintenance_plans', 'maintenance_agreements', 'change_requests', 'maintenance_log',
    'time_entries', 'comments', 'documents', 'files', 'site_details',
    'handover_pages', 'handover_sections', 'app_settings', 'email_log'
  ]
  loop
    execute format(
      'create policy admin_all on public.%I for all to authenticated
         using ((select private.is_admin())) with check ((select private.is_admin()))', t);
  end loop;
end;
$$;

create policy admin_select on public.approvals for select to authenticated
  using ((select private.is_admin()));
create policy admin_select on public.activity_log for select to authenticated
  using ((select private.is_admin()));
create policy admin_insert on public.activity_log for insert to authenticated
  with check ((select private.is_admin()));

-- ---------------------------------------------------------------------------
-- Client: read access
-- ---------------------------------------------------------------------------

create policy member_select on public.clients for select to authenticated
  using (private.is_member(id));

create policy member_select on public.client_members for select to authenticated
  using (private.is_member(client_id));

create policy member_select on public.profiles for select to authenticated
  using (private.can_see_profile(user_id));

create policy member_select on public.projects for select to authenticated
  using (private.is_member(client_id));

create policy member_select on public.project_phases for select to authenticated
  using (private.can_see_project(project_id));

create policy member_select on public.project_steps for select to authenticated
  using (visible_to_client and private.can_see_project(project_id));

create policy member_select on public.approval_rounds for select to authenticated
  using (private.can_see_step(step_id));

create policy member_select on public.approvals for select to authenticated
  using (private.can_see_step(step_id));

create policy member_select on public.form_responses for select to authenticated
  using (private.can_see_step(step_id));

create policy member_select on public.form_definitions for select to authenticated
  using (private.can_see_form_definition(id));

create policy member_select on public.comments for select to authenticated
  using (
    not internal
    and (
      (step_id is not null and private.can_see_step(step_id))
      or (change_request_id is not null and private.can_see_change_request(change_request_id))
    )
  );

create policy member_select on public.documents for select to authenticated
  using (
    visible_to_client
    and private.can_see_project(project_id)
    and (step_id is null or private.can_see_step(step_id))
  );

create policy member_select on public.files for select to authenticated
  using (
    visible_to_client
    and private.is_member(client_id)
    and (step_id is null or private.can_see_step(step_id))
    and (change_request_id is null or private.can_see_change_request(change_request_id))
  );

create policy member_select on public.site_details for select to authenticated
  using (private.can_see_project(project_id));

create policy member_select on public.handover_pages for select to authenticated
  using (published_at is not null and private.can_see_project(project_id));

create policy member_select on public.handover_sections for select to authenticated
  using (visible and private.can_see_handover_page(page_id));

create policy member_select on public.maintenance_plans for select to authenticated
  using (private.can_see_plan(id));

create policy member_select on public.maintenance_agreements for select to authenticated
  using (private.is_member(client_id));

create policy member_select on public.change_requests for select to authenticated
  using (private.is_member(client_id));

create policy member_select on public.maintenance_log for select to authenticated
  using (visible_to_client and private.is_member(client_id));

-- Never readable by clients: admins, client_private, process_templates, template_phases,
-- template_steps, time_entries, activity_log, email_log, app_settings.

-- ---------------------------------------------------------------------------
-- Client: narrow direct writes
-- ---------------------------------------------------------------------------

create policy own_insert on public.profiles for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy own_update on public.profiles for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy member_insert on public.comments for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and not internal
    and (
      (step_id is not null and private.can_see_step(step_id))
      or (change_request_id is not null and private.can_see_change_request(change_request_id))
    )
  );

create policy member_insert on public.change_requests for insert to authenticated
  with check (
    private.is_member(client_id)
    and created_by = (select auth.uid())
    and status = 'new'
    and estimate_minutes is null
    and accepted_at is null
    and done_at is null
  );

-- Drafts only; submitting goes through the submit_form RPC (milestone 4).
create function private.can_edit_form_draft(p_step_id uuid) returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.project_steps s
    where s.id = p_step_id
      and s.type = 'form'
      and s.owner = 'client'
      and s.status = 'active'
      and private.can_see_step(s.id)
  );
$$;
revoke execute on function private.can_edit_form_draft(uuid) from public;
grant execute on function private.can_edit_form_draft(uuid) to authenticated;

create policy member_insert on public.form_responses for insert to authenticated
  with check (
    status = 'draft'
    and submitted_at is null
    and definition_snapshot is null
    and private.can_edit_form_draft(step_id)
  );
create policy member_update on public.form_responses for update to authenticated
  using (status = 'draft' and private.can_edit_form_draft(step_id))
  with check (
    status = 'draft'
    and submitted_at is null
    and definition_snapshot is null
    and private.can_edit_form_draft(step_id)
  );

-- ---------------------------------------------------------------------------
-- Integrity triggers
-- ---------------------------------------------------------------------------

-- comments.project_id always follows its parent.
create function private.comments_set_project() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.step_id is not null then
    select s.project_id into new.project_id from public.project_steps s where s.id = new.step_id;
  else
    select cr.project_id into new.project_id from public.change_requests cr where cr.id = new.change_request_id;
  end if;
  return new;
end;
$$;
create trigger comments_set_project before insert or update of step_id, change_request_id on public.comments
  for each row execute function private.comments_set_project();

-- For change requests sent by clients, the studio-side fields are set here, not by the client.
-- Security invoker, so current_user is the caller's role (service_role for server jobs).
create function private.change_requests_client_defaults() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if private.is_admin() or current_user = 'service_role' then
    return new;
  end if;
  new.status := 'new';
  new.estimate_minutes := null;
  new.accepted_at := null;
  new.done_at := null;
  new.billing := case
    when exists (
      select 1 from public.maintenance_agreements a
      where a.project_id = new.project_id and a.status = 'active'
    ) then 'included'::public.change_request_billing
    else 'quote_needed'::public.change_request_billing
  end;
  return new;
end;
$$;
create trigger change_requests_client_defaults before insert on public.change_requests
  for each row execute function private.change_requests_client_defaults();

-- Approvals and the activity log are permanent. The only exception is a GDPR purge
-- (purge_client, milestone 8), which sets app.purge_client for its own transaction.
create function private.prevent_record_changes() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' and coalesce(current_setting('app.purge_client', true), '') <> '' then
    return old;
  end if;
  raise exception '% is append-only', tg_table_name using errcode = 'insufficient_privilege';
end;
$$;
create trigger prevent_record_changes before update or delete on public.approvals
  for each row execute function private.prevent_record_changes();
create trigger prevent_record_changes before update or delete on public.activity_log
  for each row execute function private.prevent_record_changes();
create trigger prevent_record_truncate before truncate on public.approvals
  for each statement execute function private.prevent_record_changes();
create trigger prevent_record_truncate before truncate on public.activity_log
  for each statement execute function private.prevent_record_changes();
