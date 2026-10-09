-- Core schema for the client hub. See docs/PLAN.md §2.
-- RLS policies live in the next migration; every table here gets RLS enabled there.

create schema if not exists private;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.step_owner as enum ('studio', 'client');
create type public.step_type as enum ('task', 'upload', 'approval', 'form', 'link');
create type public.step_status as enum ('pending', 'active', 'done', 'skipped');
create type public.phase_status as enum ('pending', 'active', 'done');
create type public.step_mode as enum ('sequential', 'parallel');
create type public.project_status as enum ('active', 'paused', 'completed', 'archived');
create type public.approval_decision as enum ('approved', 'changes_requested');
create type public.form_response_status as enum ('draft', 'submitted');
create type public.document_type as enum ('proposal', 'contract', 'invoice', 'other');
create type public.document_status as enum ('draft', 'sent', 'accepted', 'signed', 'paid', 'void');
create type public.party as enum ('client', 'studio');
create type public.handover_section_kind as enum (
  'logos', 'colours', 'fonts', 'website_guide', 'domain_hosting', 'links_contacts', 'access_notes', 'custom'
);
create type public.agreement_status as enum ('proposed', 'active', 'paused', 'ended');
create type public.change_request_urgency as enum ('normal', 'urgent');
create type public.change_request_status as enum (
  'new', 'accepted', 'in_progress', 'waiting_on_client', 'done', 'declined'
);
create type public.change_request_billing as enum ('included', 'extra', 'quote_needed');

-- ---------------------------------------------------------------------------
-- Helpers used by table definitions
-- ---------------------------------------------------------------------------

create function private.set_updated_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Only http(s) URLs may be stored, so nothing like `javascript:` ever ends up in an href.
create function private.is_http_url(value text) returns boolean
language sql
immutable
set search_path = ''
as $$
  select value is null or value ~* '^https?://[^\s]+$';
$$;

-- ---------------------------------------------------------------------------
-- Identity and clients
-- ---------------------------------------------------------------------------

create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  full_name text check (char_length(full_name) <= 200),
  phone text check (char_length(phone) <= 50),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 200),
  org_number text check (char_length(org_number) <= 20),
  contact_email text check (char_length(contact_email) <= 320),
  contact_phone text check (char_length(contact_phone) <= 50),
  address text check (char_length(address) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Split from `clients` because RLS is per row, not per column.
create table public.client_private (
  client_id uuid primary key references public.clients (id) on delete cascade,
  internal_notes text,
  updated_at timestamptz not null default now()
);

create table public.client_members (
  client_id uuid not null references public.clients (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (client_id, user_id)
);
create index client_members_user_id_idx on public.client_members (user_id);

-- ---------------------------------------------------------------------------
-- Process templates
-- ---------------------------------------------------------------------------

create table public.form_definitions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  title text not null,
  description text,
  -- { "sections": [ { "title", "description"?, "fields": [ { "key", "label", "help"?, "kind", "required"?, "options"? } ] } ] }
  schema jsonb not null,
  -- When set, submitted answers are also written into that table (e.g. site_details).
  binding text check (binding in ('site_details')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.process_templates (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.template_phases (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.process_templates (id) on delete cascade,
  position integer not null,
  name text not null,
  description text,
  step_mode public.step_mode not null default 'sequential',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (template_id, position) deferrable initially deferred
);

create table public.template_steps (
  id uuid primary key default gen_random_uuid(),
  phase_id uuid not null references public.template_phases (id) on delete cascade,
  position integer not null,
  title text not null,
  description text,
  owner public.step_owner not null,
  type public.step_type not null,
  visible_to_client boolean not null default true,
  -- Approval steps only. Null = no limit on included rounds.
  max_revision_rounds integer check (max_revision_rounds >= 0),
  form_definition_id uuid references public.form_definitions (id) on delete restrict,
  -- Per type: upload → { accept, examples }, link → { url, label }, approval → { studio_working_text }
  config jsonb not null default '{}',
  due_offset_days integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (phase_id, position) deferrable initially deferred,
  check (type = 'form' or form_definition_id is null),
  check (type <> 'form' or form_definition_id is not null),
  check (type = 'approval' or max_revision_rounds is null)
);

-- ---------------------------------------------------------------------------
-- Projects
-- ---------------------------------------------------------------------------

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  template_id uuid references public.process_templates (id) on delete set null,
  name text not null check (char_length(name) between 1 and 200),
  status public.project_status not null default 'active',
  start_date date,
  target_launch_date date,
  staging_url text check (private.is_http_url(staging_url)),
  live_url text check (private.is_http_url(live_url)),
  cms_url text check (private.is_http_url(cms_url)),
  launched_at timestamptz,
  reminders_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Lets child tables carry client_id with a guarantee that it matches the project.
  unique (id, client_id)
);
create index projects_client_id_idx on public.projects (client_id);

create table public.project_phases (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  template_phase_id uuid references public.template_phases (id) on delete set null,
  position integer not null,
  name text not null,
  description text,
  step_mode public.step_mode not null default 'sequential',
  status public.phase_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, position) deferrable initially deferred,
  unique (id, project_id)
);

create table public.project_steps (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  phase_id uuid not null,
  template_step_id uuid references public.template_steps (id) on delete set null,
  position integer not null,
  title text not null,
  description text,
  owner public.step_owner not null,
  type public.step_type not null,
  status public.step_status not null default 'pending',
  visible_to_client boolean not null default true,
  max_revision_rounds integer check (max_revision_rounds >= 0),
  form_definition_id uuid references public.form_definitions (id) on delete restrict,
  config jsonb not null default '{}',
  due_date date,
  activated_at timestamptz,
  completed_at timestamptz,
  completed_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- project_id must be the phase's project.
  foreign key (phase_id, project_id) references public.project_phases (id, project_id) on delete cascade,
  unique (phase_id, position) deferrable initially deferred,
  check (type = 'form' or form_definition_id is null),
  check (type <> 'form' or form_definition_id is not null),
  check (type = 'approval' or max_revision_rounds is null)
);
create index project_steps_project_id_idx on public.project_steps (project_id);
create index project_steps_active_idx on public.project_steps (project_id) where status = 'active';

create table public.approval_rounds (
  id uuid primary key default gen_random_uuid(),
  step_id uuid not null references public.project_steps (id) on delete cascade,
  round integer not null check (round > 0),
  note text,
  link text check (private.is_http_url(link)),
  opened_by uuid references auth.users (id) on delete set null,
  opened_at timestamptz not null default now(),
  unique (step_id, round)
);

-- Append-only (trigger in the RLS migration).
create table public.approvals (
  id uuid primary key default gen_random_uuid(),
  step_id uuid not null references public.project_steps (id) on delete cascade,
  round_id uuid not null references public.approval_rounds (id) on delete cascade,
  round integer not null,
  user_id uuid not null references auth.users (id),
  decision public.approval_decision not null,
  comment text check (char_length(comment) <= 10000),
  created_at timestamptz not null default now(),
  -- One decision per round.
  unique (round_id)
);
create index approvals_step_id_idx on public.approvals (step_id);

create table public.form_responses (
  id uuid primary key default gen_random_uuid(),
  step_id uuid not null unique references public.project_steps (id) on delete cascade,
  answers jsonb not null default '{}',
  status public.form_response_status not null default 'draft',
  definition_snapshot jsonb,
  submitted_at timestamptz,
  submitted_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Maintenance (before records, since comments/files reference change_requests)
-- ---------------------------------------------------------------------------

create table public.maintenance_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  monthly_price_ore integer not null check (monthly_price_ore >= 0),
  included_minutes_per_month integer not null check (included_minutes_per_month >= 0),
  includes text[] not null default '{}',
  response_time text,
  notice_period text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.maintenance_agreements (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  project_id uuid not null,
  plan_id uuid not null references public.maintenance_plans (id) on delete restrict,
  price_override_ore integer check (price_override_ore >= 0),
  minutes_override integer check (minutes_override >= 0),
  start_date date not null,
  end_date date,
  status public.agreement_status not null default 'proposed',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (project_id, client_id) references public.projects (id, client_id) on delete cascade,
  check (end_date is null or end_date >= start_date)
);
create index maintenance_agreements_project_id_idx on public.maintenance_agreements (project_id);

create table public.change_requests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  project_id uuid not null,
  created_by uuid references auth.users (id) on delete set null,
  title text not null check (char_length(title) between 1 and 200),
  description text check (char_length(description) <= 20000),
  urgency public.change_request_urgency not null default 'normal',
  status public.change_request_status not null default 'new',
  billing public.change_request_billing not null default 'quote_needed',
  estimate_minutes integer check (estimate_minutes >= 0),
  accepted_at timestamptz,
  done_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (project_id, client_id) references public.projects (id, client_id) on delete cascade
);
create index change_requests_project_id_idx on public.change_requests (project_id);
create index change_requests_open_idx on public.change_requests (client_id)
  where status not in ('done', 'declined');

create table public.maintenance_log (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  project_id uuid not null,
  entry_date date not null default current_date,
  title text not null check (char_length(title) between 1 and 200),
  description text,
  visible_to_client boolean not null default true,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (project_id, client_id) references public.projects (id, client_id) on delete cascade
);
create index maintenance_log_project_date_idx on public.maintenance_log (project_id, entry_date desc);

create table public.time_entries (
  id uuid primary key default gen_random_uuid(),
  change_request_id uuid references public.change_requests (id) on delete cascade,
  maintenance_log_id uuid references public.maintenance_log (id) on delete cascade,
  entry_date date not null default current_date,
  minutes integer not null check (minutes > 0),
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (num_nonnulls(change_request_id, maintenance_log_id) = 1)
);
create index time_entries_change_request_idx on public.time_entries (change_request_id);
create index time_entries_maintenance_log_idx on public.time_entries (maintenance_log_id);

-- ---------------------------------------------------------------------------
-- Records
-- ---------------------------------------------------------------------------

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  -- Filled from the parent by trigger; used for fast RLS checks.
  project_id uuid not null references public.projects (id) on delete cascade,
  step_id uuid references public.project_steps (id) on delete cascade,
  change_request_id uuid references public.change_requests (id) on delete cascade,
  author_id uuid references auth.users (id) on delete set null,
  body text not null check (char_length(body) between 1 and 10000),
  internal boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (num_nonnulls(step_id, change_request_id) = 1)
);
create index comments_step_id_idx on public.comments (step_id);
create index comments_change_request_id_idx on public.comments (change_request_id);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  step_id uuid references public.project_steps (id) on delete set null,
  type public.document_type not null,
  title text not null check (char_length(title) between 1 and 200),
  storage_path text unique,
  external_url text check (private.is_http_url(external_url)),
  status public.document_status not null default 'draft',
  document_date date not null default current_date,
  visible_to_client boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (num_nonnulls(storage_path, external_url) = 1)
);
create index documents_project_id_idx on public.documents (project_id);

create table public.files (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null,
  project_id uuid not null,
  step_id uuid references public.project_steps (id) on delete set null,
  change_request_id uuid references public.change_requests (id) on delete set null,
  uploaded_by uuid references auth.users (id) on delete set null,
  storage_path text not null unique,
  name text not null check (char_length(name) between 1 and 255),
  size_bytes bigint not null check (size_bytes >= 0),
  mime_type text not null,
  visible_to_client boolean not null default true,
  created_at timestamptz not null default now(),
  foreign key (project_id, client_id) references public.projects (id, client_id) on delete cascade
);
create index files_project_id_idx on public.files (project_id);
create index files_step_id_idx on public.files (step_id);

-- Append-only (trigger in the RLS migration).
create table public.activity_log (
  id bigint generated always as identity primary key,
  client_id uuid not null references public.clients (id) on delete cascade,
  project_id uuid references public.projects (id) on delete cascade,
  -- No FK, so the history survives if a user is removed.
  actor_id uuid,
  event text not null,
  entity_type text,
  entity_id uuid,
  data jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index activity_log_project_idx on public.activity_log (project_id, created_at desc);
create index activity_log_client_idx on public.activity_log (client_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Site details and handover
-- ---------------------------------------------------------------------------

create table public.site_details (
  project_id uuid primary key references public.projects (id) on delete cascade,
  domain_name text,
  registrar text,
  domain_owner public.party,
  domain_renewal_date date,
  hosting_provider text,
  hosting_owner public.party,
  hosting_renewal_date date,
  dns_provider text,
  email_provider text,
  -- Who has access to what. References only, never passwords.
  access_notes text,
  google_business_profile_url text check (private.is_http_url(google_business_profile_url)),
  analytics_notes text,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.handover_pages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.projects (id) on delete cascade,
  published_at timestamptz,
  -- 256 bits, base64url. Regenerate to revoke old links.
  public_token text not null unique
    default rtrim(translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/', '-_'), '='),
  public_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.handover_sections (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.handover_pages (id) on delete cascade,
  kind public.handover_section_kind not null,
  position integer not null,
  title text not null,
  -- Shape depends on `kind`; validated in the app.
  content jsonb not null default '{}',
  visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (page_id, position) deferrable initially deferred
);

-- ---------------------------------------------------------------------------
-- System
-- ---------------------------------------------------------------------------

create table public.app_settings (
  id boolean primary key default true check (id),
  reminder_after_days integer not null default 5 check (reminder_after_days > 0),
  reminder_interval_days integer not null default 7 check (reminder_interval_days > 0),
  max_upload_bytes bigint not null default 52428800 check (max_upload_bytes > 0),
  allowed_mime_types text[] not null default array[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'image/heic',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'application/zip',
    'application/postscript',
    'application/illustrator'
  ],
  updated_at timestamptz not null default now()
);
insert into public.app_settings default values;

create table public.email_log (
  id bigint generated always as identity primary key,
  kind text not null,
  entity_id uuid,
  recipient text not null,
  resend_id text,
  sent_at timestamptz not null default now()
);
create index email_log_lookup_idx on public.email_log (kind, entity_id, sent_at desc);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'clients', 'client_private', 'form_definitions', 'process_templates',
    'template_phases', 'template_steps', 'projects', 'project_phases', 'project_steps',
    'form_responses', 'maintenance_plans', 'maintenance_agreements', 'change_requests',
    'maintenance_log', 'time_entries', 'comments', 'documents', 'site_details',
    'handover_pages', 'handover_sections', 'app_settings'
  ]
  loop
    execute format(
      'create trigger set_updated_at before update on public.%I
         for each row execute function private.set_updated_at()', t);
  end loop;
end;
$$;
