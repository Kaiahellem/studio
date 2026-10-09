# studio

Client hub for the studio: one place per client for process, documents, files, approvals,
handover and maintenance. See [`BRIEF.md`](BRIEF.md) for the brief and [`docs/PLAN.md`](docs/PLAN.md)
for the approved plan.

## Local development

Requirements: Node 22+, pnpm, the Supabase CLI and a Docker engine (OrbStack or Docker Desktop, running).

```sh
pnpm install
pnpm db:start                 # local Supabase (Postgres, Auth, Storage, Mailpit)
cp .env.example .env.local    # fill in values from `pnpm db:env` and SEED_ADMIN_EMAIL
pnpm db:reset && pnpm seed    # migrations + demo data
pnpm dev                      # http://localhost:3000
```

Log in at `/logg-inn`. Emails do not leave your machine; read them in Mailpit at
http://127.0.0.1:54324. The first admin login asks you to set up an authenticator app (TOTP).

Demo users: `ola@fjordlys.example`, `kari@fjordlys.example` (Fjordlys Rør AS) and
`nina@nordvik.example` (Nordvik Regnskap AS).

## Checks

```sh
pnpm check      # lint + type check + unit tests
pnpm test:rls   # RLS isolation tests (needs `pnpm db:start`)
pnpm test:e2e   # Playwright login flows, desktop and mobile (needs `pnpm db:start`)
```

## Hosted Supabase settings

Mirror `supabase/config.toml` in the dashboard (Authentication):

- **Allow new users to sign up: off.** Only invited users can log in.
- **Email provider: on.** Turning it off disables login entirely, not just sign-up.
- **MFA → TOTP: on.**
- Email rate limit (minimum interval per user): 60 seconds. Locally it is 5 seconds so tests run quickly.
- Email template "Magic link": contents of `supabase/templates/magic_link.html`.
- Custom SMTP via Resend, so login email comes from your own domain.

## Structure

- `supabase/migrations/` – schema, RLS, functions, storage and the Website template. All schema changes go here.
- `src/app/` – routes: `(auth)` login, `(client)` client hub, `studio` admin, `(public)` public pages.
- `src/features/` – server actions and queries per domain.
- `src/lib/` – Supabase clients, auth guards, formatting (NOK, dates in Europe/Oslo).
- `src/i18n/nb.ts` – every UI string.
- `tests/unit`, `tests/rls`, `tests/e2e` – Vitest unit tests, RLS tests against local Supabase, Playwright.
