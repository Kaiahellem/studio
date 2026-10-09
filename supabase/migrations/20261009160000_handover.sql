-- Milestone 5: launch and handover.

-- Creates the handover page with the default sections (BRIEF.md, "Handover page"), or
-- returns the existing one.
create function public.create_handover_page(p_project_id uuid) returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid;
begin
  perform private.require_admin();
  select id into v_id from public.handover_pages where project_id = p_project_id;
  if v_id is not null then
    return v_id;
  end if;

  insert into public.handover_pages (project_id) values (p_project_id) returning id into v_id;
  insert into public.handover_sections (page_id, kind, position, title) values
    (v_id, 'logos', 1, 'Logo'),
    (v_id, 'colours', 2, 'Farger'),
    (v_id, 'fonts', 3, 'Fonter'),
    (v_id, 'website_guide', 4, 'Slik oppdaterer du nettsiden'),
    (v_id, 'domain_hosting', 5, 'Domene og hosting'),
    (v_id, 'links_contacts', 6, 'Viktige lenker og kontakter'),
    (v_id, 'access_notes', 7, 'Innlogginger');
  perform private.log_event(p_project_id, 'handover.created', 'handover_page', v_id);
  return v_id;
end;
$$;

-- Makes every previously shared public link stop working.
create function public.regenerate_handover_token(p_page_id uuid) returns void
language plpgsql
set search_path = ''
as $$
begin
  perform private.require_admin();
  update public.handover_pages
  set public_token = rtrim(translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/', '-_'), '=')
  where id = p_page_id;
end;
$$;

-- The first time a live URL is set, the project counts as launched.
create function private.set_launched_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.live_url is not null and old.live_url is null and new.launched_at is null then
    new.launched_at := now();
  end if;
  return new;
end;
$$;
create trigger set_launched_at before update of live_url on public.projects
  for each row execute function private.set_launched_at();

do $$
declare
  f text;
begin
  foreach f in array array['create_handover_page(uuid)', 'regenerate_handover_token(uuid)']
  loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated, service_role', f);
  end loop;
end;
$$;
