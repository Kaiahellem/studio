# Client Hub — Plan (for approval)

Status: **draft, awaiting approval.** No application code is written until this is approved.

This covers what `BRIEF.md` asks for in step 1 of "How to work": data model, RLS policies, folder structure and route map, plus the decisions and open questions that came up while working through the brief.

---

## 0. Prerequisites on your machine

Checked on 2026-10-09:

| Tool | Status | Needed for |
|---|---|---|
| Node 22.16, pnpm 10.16 | ✅ installed | everything (I'll use pnpm) |
| Supabase CLI | ❌ missing | migrations, local database, types |
| Docker (or OrbStack) | ❌ missing | local Supabase (`supabase start`) and the RLS tests |
| Vercel CLI | ❌ missing (optional) | env sync and preview deploys; the dashboard also works |

Suggested: `brew install supabase/tap/supabase` and `brew install --cask orbstack` (a lighter Docker alternative on macOS).

Hosted resources you create (I can't create these for you):
- **Supabase project in `eu-north-1` (Stockholm)**, the closest EU region to Norway. Frankfurt also works.
- **Vercel project** with function region `arn1` (Stockholm), next to the database.
- **Resend** with your sending domain verified, using the EU sending region.

---

## 1. Key decisions

| Decision | Choice | Why |
|---|---|---|
| Scheduled jobs | **Vercel Cron**: one daily job (`/api/cron/daily`, 07:00 Europe/Oslo) protected by `CRON_SECRET` | Every email goes through Resend with templates and strings from the Next.js codebase. With pg_cron, the database would need `pg_net` to call Resend or call back into the app, so the email logic would live in two places. Daily runs are enough: reminders are counted in days, and renewals in weeks. Urgent emails are sent straight from the server action, not by cron. |
| Login | **Magic link for everyone, me included**; public sign-up turned off (`shouldCreateUser: false`) | One flow and less attack surface. Only invited users can log in. Passwords can be added later if you want them. |
| Auth emails | Supabase **custom SMTP via Resend** | Login and invite emails come from your domain, not Supabase's rate-limited default sender. |
| Admin role | `admins` table + `is_admin()` SQL function | Easy to inspect and test. Revoking takes effect immediately; a JWT claim would stay valid until the token refreshes. |
| Client state transitions | **Postgres functions (RPC, `security definer`)** for approve, submit form, complete upload step and the site-details form | The rule check, status change, approval record and activity log happen in **one transaction**. Clients get no direct `UPDATE` on steps. Server actions check the role first and then call the RPC (two layers of checks). |
| Service-role key | Only used for: cron, invites, export/delete, seeding | Everything else runs as the logged-in user, so RLS always applies. |
| File uploads | Server action checks role, step, size and type → **signed upload URL** → browser uploads directly to Storage → RPC registers the file | Avoids Vercel's ~4.5 MB request body limit. File limits are also enforced on the bucket itself. |
| Template data | Website template, questionnaire and default maintenance plan as a **data migration** (exists in production). Demo client, project and users in a **dev-only seed script**. | Production needs the template; it must not get demo users. |
| Admin UI language | Norwegian too, from the same dictionary (`src/i18n/nb.ts`) | One place for all strings. URL segments: Norwegian on the client side, English under `/studio` (only you see those). |

---

## 2. Data model (refined)

Conventions: `id uuid pk default gen_random_uuid()`, `created_at timestamptz default now()`, `updated_at` via trigger. Money as `integer` in øre (`*_ore`). Time as `timestamptz`; calendar dates as `date`. Enums are Postgres enums.

Changes from the brief are marked **(new)** or **(changed)**.

### Identity and clients
- **`admins`** (new) — `user_id → auth.users`.
- **`profiles`** (new) — `user_id`, `full_name`, `phone`. Names show in comments and approvals, and they are not in `auth.users`.
- **`clients`** — `name`, `org_number`, `contact_email`, `contact_phone`, `address`.
- **`client_private`** (changed) — `client_id` (pk), `internal_notes`. Split into its own table because RLS works per row, not per column. Admin only.
- **`client_members`** — `client_id`, `user_id`, unique pair. A user can belong to more than one client, which is rare but costs nothing.

### Process (template layer, admin only)
- **`process_templates`** — `key` (`website`), `name`, `description`, `is_active`.
- **`template_phases`** — `template_id`, `position`, `name`, `description`, **`step_mode`** (new: `sequential` | `parallel`, see §6.1).
- **`template_steps`** — `phase_id`, `position`, `title`, `description`, `owner`, `type`, `visible_to_client`, `max_revision_rounds`, `form_definition_id?`, `config jsonb` (per type: accepted file types for upload, URL for link, and so on), `due_offset_days?`.
- **`form_definitions`** — `key`, `title`, `schema jsonb` (sections → fields: `key`, `label`, `help`, `kind` text/textarea/select/multiselect/boolean/url/date, `required`, `options`), **`binding`** (new: `null` | `site_details`; the "Domene og tilganger" form writes its answers into `site_details`).

### Process (project layer)
- **`projects`** — `client_id`, `template_id`, `name`, `status` (`active`, `paused`, `completed`, `archived`), `start_date`, `target_launch_date`, `staging_url`, `live_url`, `cms_url`, `launched_at?`, **`reminders_enabled`** (new, default true).
- **`project_phases`** — copied from the template: `project_id`, `position`, `name`, `description`, `step_mode`, `status` (`pending`, `active`, `done`).
- **`project_steps`** — copied: everything from `template_steps` + `project_id`, `status` (`pending`, `active`, `done`, `skipped`), `due_date?`, `activated_at`, `completed_at`, `completed_by`.
- **`approval_rounds`** (new) — `step_id`, `round`, `opened_at`, `note`, `link?`. I open a round when I share a version for review. This is how the app knows whose turn it is after "Be om endringer" (see §6.2).
- **`form_responses`** — `step_id`, `answers jsonb`, `status` (`draft`, `submitted`), `submitted_at`, `submitted_by`, **`definition_snapshot jsonb`** (new: saved on submit, so old answers can still be read after the questions change).

### Records
- **`approvals`** — `step_id`, `round_id`, `round`, `user_id`, `decision` (`approved`, `changes_requested`), `comment`, `created_at`. **Append-only**, enforced by a trigger (§3.4).
- **`comments`** — `step_id?` **or** `change_request_id?` (check: exactly one), `author_id`, `body`, `internal` (default false).
- **`documents`** — `project_id`, `step_id?` (changed: optional link to a step such as "Signert kontrakt"), `type`, `title`, `storage_path?` **or** `external_url?`, `status` (`draft`, `sent`, `accepted`, `signed`, `paid`, `void`), `document_date`, **`visible_to_client`** (new, default true; lets drafts stay hidden).
- **`files`** — `project_id`, `client_id` (denormalised for storage policies), `step_id?`, `change_request_id?`, `uploaded_by`, `storage_path`, `name`, `size_bytes`, `mime_type`, **`visible_to_client`** (new).
- **`activity_log`** — `client_id`, `project_id?`, `actor_id?`, `event` (text such as `step.completed`), `entity_type`, `entity_id`, `data jsonb`, `created_at`. Append-only. Admin only in v1.

### Site details and handover
- **`site_details`** — one per project, fields as in the brief. `domain_owner` and `hosting_owner` are an enum (`client`, `studio`). No secrets.
- **`handover_pages`** (new) — `project_id` (unique), `published_at?`, `public_token` (random, 32+ bytes, base64url), `public_enabled` (default false).
- **`handover_sections`** (new) — `page_id`, `kind` (`logos`, `colours`, `fonts`, `website_guide`, `domain_hosting`, `links_contacts`, `access_notes`, `custom`), `position`, `title`, `content jsonb` (shape per `kind`, validated in the app), `visible`. A future Brand Hub adds new `kind` values rather than new tables. Logo files are `files` rows that the section points to.

### Maintenance
- **`maintenance_plans`** — `name`, `monthly_price_ore`, `included_minutes_per_month`, `includes text[]`, `response_time`, `notice_period`, `is_active`. Time is stored in minutes, like `time_entries`.
- **`maintenance_agreements`** — `client_id`, `project_id`, `plan_id`, `price_override_ore?`, `minutes_override?`, `start_date`, `end_date?`, `status`.
- **`change_requests`** — `client_id`, `project_id`, `created_by`, `title`, `description`, `urgency`, `status`, `billing`, `estimate_minutes?`, `accepted_at`, `done_at`. Without an active agreement, `billing` defaults to `quote_needed`.
- **`time_entries`** — `change_request_id?` **or** `maintenance_log_id?` (exactly one), `entry_date`, `minutes`, `description`. Admin only.
- **`maintenance_log`** — `client_id`, `project_id`, `entry_date`, `title`, `description`, `visible_to_client`.

### System
- **`app_settings`** (new, single row) — `reminder_after_days` (5), `reminder_interval_days` (7), `max_upload_bytes`, `allowed_mime_types text[]`.
- **`email_log`** (new) — `kind`, `entity_id`, `recipient`, `sent_at`, `resend_id`. Used to avoid duplicate emails ("at most once a week", "80 % warning once per month") and to debug delivery.

**Hours used** = the sum of `time_entries.minutes` in the current calendar month (Europe/Oslo) for entries on the agreement's `maintenance_log` rows plus `change_requests` with `billing = 'included'`. Clients only see this total, through the function `agreement_usage(agreement_id, month)`.

---

## 3. RLS policies

RLS is **enabled on every table**, with no `public`/`anon` grants. Helper functions are `security definer stable`, `search_path = ''`:

- `is_admin()` → there is a row in `admins` for `auth.uid()`
- `is_member(client_id)` → there is a row in `client_members` for `auth.uid()`
- `project_client(project_id)` / `step_project(step_id)` → small lookups used in policies

### 3.1 Read access (SELECT)

| Table | Admin | Client member |
|---|---|---|
| `clients` | all | own client |
| `client_private`, `admins`, `process_templates`, `template_*`, `time_entries`, `activity_log`, `email_log`, `app_settings` | all | **none** |
| `client_members`, `profiles` | all | own client's members (to see who has access) |
| `projects` | all | own client |
| `project_phases` | all | own client |
| `project_steps` | all | own client **and** `visible_to_client` |
| `approval_rounds`, `approvals`, `form_responses` | all | when the parent step is visible to them |
| `form_definitions` | all | only definitions used by a visible step in their project |
| `comments` | all | parent visible **and** `internal = false` |
| `documents`, `files` | all | own client **and** `visible_to_client` (and the parent step visible, if it has one) |
| `site_details` | all | own project |
| `handover_pages`, `handover_sections` | all | own project **and** `published_at is not null` (sections: `visible`) |
| `maintenance_plans` | all | plans used by their own agreements |
| `maintenance_agreements`, `change_requests` | all | own client |
| `maintenance_log` | all | own client **and** `visible_to_client` |

### 3.2 Write access

- **Admin:** insert/update/delete on everything except `approvals` and `activity_log` (insert only).
- **Client, direct writes (narrow policies):**
  - `comments` insert: `author_id = auth.uid()`, `internal = false`, and the parent is visible to them.
  - `change_requests` insert: own client, `created_by = auth.uid()`, `status = 'new'`. The `billing` value is set by the database.
  - `form_responses` insert/update: only while `status = 'draft'` and the step is active and visible.
  - `profiles` update: own row.
- **Client, through RPC only:** `submit_approval`, `submit_form`, `register_upload`, `complete_client_step`. Each one checks membership, visibility, `status = 'active'` and step type, then writes the record, step status, next step activation and activity log in one transaction.

### 3.3 Storage

One private bucket, `project-files`, with a size limit and allowed MIME types on the bucket. Path: `{client_id}/{project_id}/{uuid}-{slugified-name}`.
- **select:** admin, or a `files`/`documents` row with this `storage_path` exists **and** passes the same visibility rule as §3.1. This mirrors the table policies instead of only checking the folder.
- **insert:** admin, or a member of the `client_id` in the first path segment (used by the signed upload URL).
- **update/delete:** admin only.
- Downloads use short-lived signed URLs created on the server.
- **Public handover link:** `get_public_handover(token)` is a `security definer` function that returns data only when `public_enabled = true`. The route handler then creates signed URLs only for the logo files that page references.

### 3.4 Append-only records and GDPR delete

A trigger on `approvals` and `activity_log` blocks `UPDATE` always, and blocks `DELETE` unless the transaction has set `app.purge_client = <client_id>`. Only the admin RPC `purge_client(client_id)` sets it. That function also returns the storage paths so the server can delete the files. Records stay permanent in normal use, while a GDPR delete is still possible.

### 3.5 RLS tests (Vitest against local Supabase)

Users are created with the admin API and log in through `generateLink` + `verifyOtp`, so no passwords are needed. Seed: client A (2 users), client B (1 user), admin. The tests check that:
- A cannot read B's clients/projects/steps/comments/documents/files/storage objects/change requests (each table).
- A cannot read hidden steps, internal comments, `client_private`, `time_entries` or `activity_log`.
- A cannot insert an internal comment, a comment on a hidden step, or a change request for B.
- A cannot update or delete `approvals`. Admin cannot either, outside of purge.
- A can run `agreement_usage` for their own agreement only.
- `get_public_handover` returns nothing when `public_enabled = false` or the token is wrong.
- Anon gets nothing from any table.

---

## 4. Folder structure

```
studio/
├─ BRIEF.md
├─ docs/PLAN.md
├─ .env.example
├─ vercel.json                     # cron + region
├─ supabase/
│  ├─ config.toml
│  ├─ migrations/                  # schema, RLS, functions, template data
│  └─ seed.sql                     # local only: app_settings etc.
├─ scripts/
│  └─ seed-demo.ts                 # demo users/client/project (dev only)
├─ src/
│  ├─ app/
│  │  ├─ (auth)/logg-inn/…         # login, magic link sent
│  │  ├─ auth/confirm/route.ts     # verifies magic link (token_hash)
│  │  ├─ (public)/personvern/…
│  │  ├─ (public)/overlevering/[token]/…
│  │  ├─ (client)/…                # client hub, mobile-first
│  │  ├─ studio/…                  # admin
│  │  └─ api/
│  │     ├─ cron/daily/route.ts
│  │     └─ export/[clientId]/route.ts
│  ├─ features/                    # one folder per domain
│  │  ├─ projects/  steps/  approvals/  forms/  comments/
│  │  ├─ documents/ files/  site-details/  handover/
│  │  ├─ maintenance/  change-requests/  notifications/  privacy/
│  │  │   each: queries.ts (server reads) · actions.ts (server actions)
│  │  │         schema.ts (input validation) · components/
│  ├─ components/ui/               # shadcn primitives
│  ├─ components/                  # shared layout, typography, empty states
│  ├─ lib/
│  │  ├─ supabase/ server.ts browser.ts admin.ts middleware.ts
│  │  ├─ auth/guards.ts            # requireAdmin(), requireMember(clientId)
│  │  ├─ format/ money.ts date.ts  # nb-NO, Europe/Oslo
│  │  ├─ email/ send.ts templates/
│  │  ├─ db/types.ts               # generated by `supabase gen types`
│  │  └─ env.ts                    # validated env, server-only
│  ├─ i18n/nb.ts                   # ALL UI strings
│  └─ middleware.ts                # session refresh + route protection
└─ tests/
   ├─ unit/                        # format, step engine, hours math
   ├─ rls/                         # isolation tests (local Supabase)
   └─ e2e/                         # Playwright
```

---

## 5. Route map

### Public
| Route | Purpose |
|---|---|
| `/logg-inn` | Email field → magic link. Links to the privacy notice. |
| `/auth/confirm` | Verifies the link, then sends the user on (admin → `/studio`, client → hub) |
| `/personvern` | Privacy notice (placeholder text) |
| `/overlevering/[token]` | Public handover page (only when you've turned the link on) |

### Client (logged in, member)
| Route | Purpose |
|---|---|
| `/` | One project → redirect to it; several → simple list |
| `/p/[projectId]` | **"Din tur"** card, timeline, staging link. After launch: live site, "Rediger nettsiden", agreement summary, shortcut to "Meld inn endring" |
| `/p/[projectId]/steg/[stepId]` | Step: upload / approval / form / link + comment thread |
| `/p/[projectId]/dokumenter` | Documents |
| `/p/[projectId]/filer` | Files |
| `/p/[projectId]/overlevering` | Handover page |
| `/p/[projectId]/endringer` | List of change requests |
| `/p/[projectId]/endringer/ny` | "Meld inn endring" |
| `/p/[projectId]/endringer/[requestId]` | Status and comment thread |
| `/p/[projectId]/vedlikehold` | Agreement, hours used, log by month |

### Admin (`/studio`, logged in, admin)
| Route | Purpose |
|---|---|
| `/studio` | Dashboard: waiting on client / me / done, open change requests, hours per client, renewals |
| `/studio/clients`, `/new`, `/[clientId]` | Clients, members, invite, projects, agreements, export/delete |
| `/studio/projects/new` | Create a project from a template |
| `/studio/projects/[projectId]` | Overview + phase and step editor |
| `…/[projectId]/steps/[stepId]` | Step detail: rounds, responses, comments (including internal) |
| `…/[projectId]/documents` · `/files` · `/site` · `/handover` · `/maintenance` · `/activity` | Per-project sections |
| `/studio/change-requests`, `/[id]` | Triage, time entries |
| `/studio/plans` | Maintenance plans |
| `/studio/settings` | Reminder interval, upload limits |

### Route handlers
- `GET /api/cron/daily`: Vercel Cron with `Authorization: Bearer CRON_SECRET`. Runs step reminders, renewals within 30 days and the 80 % hours check, with deduplication through `email_log`.
- `GET /api/export/[clientId]`: admin only, streams a zip (JSON + files).

---

## 6. Places where the brief is ambiguous — my proposal

### 6.1 "Next step becomes active automatically" vs. the Content phase
With strictly sequential steps, the client must upload the logo before they can upload text, and so on. That makes the phase where projects already stall even slower.
**Proposal:** `step_mode` per phase. `sequential` (Proposal, Launch, …): one active step at a time. `parallel` (Content): every step activates together when the phase starts, and the phase is done when all of them are `done`/`skipped`. The "Din tur" card shows the first one and "+ 4 til i denne fasen".

### 6.2 Whose turn is it after "Be om endringer"?
An approval step has `owner = client`, but after a change request it's my turn until I share a new version.
**Proposal:** `approval_rounds`. I open a round ("Ny versjon klar", with a note and link), and the client approves or requests changes. If there is no open round, it's my turn. I read `max_revision_rounds = 2` as **two rounds of feedback included**. The note "Runde 3 av 2 – videre runder faktureres etter avtalen" shows when the third round opens, and I'm notified when the client uses the last included round.

### 6.3 Which hours count toward the monthly allowance?
**Proposal:** maintenance log entries + change requests marked `included`. `extra` is tracked but doesn't use up the allowance. Months follow the Oslo calendar.

### 6.4 Should clients see the estimate and billing type on change requests?
**Proposal:** yes, shown calmly as "Inkludert i avtalen" / "Faktureres i tillegg (ca. 2 t)" / "Du får et pristilbud". It's open and avoids surprises.

### 6.5 Activity log for clients?
**Proposal:** admin only in v1. Clients already get a dated record through approvals, comments and documents.

### 6.6 "Edit questions without code changes"
Definitions live in the database, so no code is needed. **Proposal:** a simple question editor in the admin (add, edit, reorder, delete questions), built in milestone 4 alongside forms. Until then, edit in the Supabase table editor. A template editor (as opposed to editing per project) waits until you add Branding.

### 6.7 Fiken and signing
Unchanged: documents are only links or PDFs. A step can point to a document, but **I** mark it done. Nothing completes automatically from a document status.

---

## 7. Dependencies — need your yes

Implied by the stack: `next`, `react`, `@supabase/supabase-js`, `@supabase/ssr`, `tailwindcss`, `resend`, `vitest`, `@playwright/test`, `supabase` (CLI, dev), plus the dependencies shadcn/ui pulls in (`radix-ui`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`).

**Beyond the brief — I'm asking:**
| Package | Why | Alternative without it |
|---|---|---|
| `zod` | Validates every server action input and the per-section handover JSON | Hand-written validation, which is more code and easier to get wrong |
| `server-only` | Build error if server code (service key) ends up in the client bundle | Discipline alone |
| `fflate` (milestone 8) | Zip for the GDPR export | Hand-written zip writer, not recommended |
| `@axe-core/playwright` (milestone 8) | Automated WCAG checks in the e2e tests | Manual NVDA/JAWS testing only |

---

## 8. Milestone 1 in practice (after approval)

1. Scaffold Next.js (TypeScript strict, App Router, Tailwind, ESLint), shadcn init, `nb.ts`, format helpers + unit tests.
2. `supabase init`, migrations: enums → tables → helpers → RLS → RPC → triggers → template data.
3. Auth: login, confirm, middleware, guards, custom SMTP (you fill in the Resend key).
4. `seed-demo.ts`: admin (your email), demo client "Fjordlys Rør AS" with 2 users, project in the Content phase.
5. RLS tests + `pnpm lint && pnpm typecheck && pnpm test` green.
6. Small commits along the way, then a summary.

---

## 9. What I need from you

1. Approve the plan, or comment on it (especially §6.1–6.6).
2. Yes or no to each dependency in §7.
3. Install Docker/OrbStack + the Supabase CLI, and create the Supabase project (Stockholm). The local part of milestone 1 can start before the hosted project exists.
4. The email address you'll use as admin, and your sending domain for Resend.
