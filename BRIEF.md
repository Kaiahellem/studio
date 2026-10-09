# Client Hub — Build Brief

You are helping me build a client hub for my freelance web design and development business. I am a solo freelancer based in Norway, and my clients are mainly small service businesses. This tool is for my own use with my clients, not a product to sell. Read this entire brief before writing any code.

## The problem

Today, everything around a client project is scattered: the proposal is in one email, the contract in another, the invoice in a third, content arrives on WeTransfer, feedback comes over SMS, and change requests after launch arrive whenever and however. Neither I nor the client has one place to see where things stand and what happens next.

## The goal

One hub per client where both I and the client can see:
- where the website project is in the process
- what the client needs to do right now
- all documents (proposal, contract, invoices)
- all files and content the client has delivered
- approvals, with a dated record of what was approved
- the staging link while the site is being built
- a handover page when the project is done
- after launch: their maintenance agreement, a way to send change requests, and a log of what I have done on their site

Version 1 supports web design, development and maintenance. Later I will add branding services, so the process must be **template-driven**, not hardcoded. Adding a "Branding" or "Branding + Website" process later should mean adding a new template, not rewriting code.

## Tech stack

- Next.js (App Router, TypeScript, strict mode)
- Supabase: Postgres, Auth (magic link for clients, email/password or magic link for me), Storage, Row Level Security. **Use an EU region.**
- Tailwind CSS (shadcn/ui is fine for primitives)
- Deployed on Vercel
- Supabase CLI for migrations; all schema changes go through migration files
- Scheduled jobs with Vercel Cron or Supabase pg_cron (pick one and explain why)
- Resend for transactional email
- Vitest for unit tests, Playwright for end-to-end tests

Ask me before adding any dependency beyond these.

## Conventions

- Money is stored as integers in øre and displayed in NOK with `nb-NO` formatting (e.g. "1 490 kr").
- Dates displayed in Norwegian format, time zone Europe/Oslo.
- All client-facing text in **Norwegian bokmål**. Code, comments and identifiers in English. All UI strings live in a single dictionary file so they are easy to edit and translate later.

## Roles

- **Admin (me):** sees and edits everything.
- **Client:** logs in with a magic link sent by email. No passwords. Sees only data belonging to their own client organisation, and only content marked visible to the client.

A client organisation can have more than one user (for example, two co-owners of a small business).

## Data model (proposal — refine it, then show me before migrating)

**Clients and projects**
- `clients` — organisation name, org number, contact info, internal notes (admin only)
- `client_members` — links auth users to a client
- `projects` — belongs to a client, created from a template, has status, start date, target launch date, staging URL, live site URL, optional CMS URL

**Process**
- `process_templates` — e.g. "Website"
- `template_phases` / `template_steps` — ordered phases and steps belonging to a template
- `project_phases` / `project_steps` — copied from the template when the project is created, then editable per project
- Each step has:
  - `owner`: `studio` or `client`
  - `type`: `task`, `upload`, `approval`, `form`, `link`
  - `status`: `pending`, `active`, `done`, `skipped`
  - `visible_to_client`: boolean (studio-only steps such as the launch checklist are hidden)
  - optional due date
  - for approval steps: `max_revision_rounds` (default 2)
- `form_definitions` — questionnaire definitions stored as structured JSON, attached to template steps, so I can edit questions without code changes
- `form_responses` — answers stored as JSON against a project step, with draft/submitted status

**Records**
- `approvals` — step, user, decision (`approved` / `changes_requested`), comment, round number, timestamp. Never edited or deleted; this is the record.
- `comments` — attached to a project step or a change request; author, body, timestamp, `internal` flag (internal comments are visible to me only)
- `documents` — project, type (`proposal`, `contract`, `invoice`, `other`), title, file or external URL, status (e.g. `sent`, `signed`, `paid`), date
- `files` — project, optional step or change request, uploader, storage path, name, size, mime type
- `activity_log` — append-only log of important events

**Site details**
- `site_details` — one per project: domain name, registrar, who owns the domain (client or studio), domain renewal date, hosting provider, who owns the hosting account, hosting renewal date, where DNS is managed, email provider (important: changing DNS can break the client's email, so this must be recorded before launch), Google Business Profile URL, analytics/Search Console notes. No passwords.

**Maintenance**
- `maintenance_plans` — my reusable plans: name, monthly price, included hours per month, what is included (list), response time, notice period
- `maintenance_agreements` — client, project, plan, optional price/hours overrides, start date, status (`proposed`, `active`, `paused`, `ended`), end date
- `change_requests` — client, project, title, description, urgency (`normal`, `urgent`), status (`new`, `accepted`, `in_progress`, `waiting_on_client`, `done`, `declined`), `billing` (`included` / `extra` / `quote_needed`), estimate in hours, timestamps
- `time_entries` — linked to a change request or a maintenance log entry: date, minutes, description. Used to calculate hours used against the monthly allowance.
- `maintenance_log` — entries visible to the client describing routine work I have done (updates, backups, checks), with date and optional time entry

Invoicing and e-signing happen in external tools (Fiken and a signing service). The hub only stores the resulting PDF or a link to it. The hub does not bill anyone; it only shows agreements and usage.

## The default "Website" template

| # | Phase | Client does | I deliver | Ends with |
|---|---|---|---|---|
| 1 | Proposal | Accepts proposal, signs contract, chooses maintenance plan (optional) | Proposal, contract, maintenance plan options | Signed contract + deposit invoice |
| 2 | Kickoff | Fills in questionnaire | Kickoff meeting | Questionnaire submitted |
| 3 | Content | Uploads text, images, logo; fills in domain and access details | Checklist of what is needed | All content and access delivered |
| 4 | Structure | Gives feedback | Sitemap and wireframes | Approval |
| 5 | Design | Gives feedback (limited rounds) | Design of key pages | Approval |
| 6 | Development | Tests on staging link | Working site on staging | Approval |
| 7 | Launch | Nothing | Launch checklist, go live | Final invoice |
| 8 | Handover | Receives access, confirms maintenance agreement | Handover page, training | Project closed, maintenance active |

Create this as seed data, with sensible steps in each phase.

**Phase 3 (Content)** is where projects usually stall. Make the content checklist clear: each required item is its own upload step with a short description of what is needed and in what format. Include a "Domene og tilganger" form step that fills `site_details`: where the domain is registered, who owns it, who has access, where email is hosted.

**Kickoff questionnaire** for service businesses (seed as a form definition, in Norwegian):
- Om bedriften: hva dere gjør, hvor lenge, hva som skiller dere fra konkurrentene
- Tjenester og priser: hvilke tjenester skal vises, skal priser vises
- Område: hvor holder dere til, hvilke områder dekker dere
- Kunder: hvem er de beste kundene deres, hva lurer de på før de tar kontakt
- Kontakt: hvordan skal kunder ta kontakt eller bestille (telefon, skjema, e-post, bookingsystem)
- Mål: hva skal nettsiden oppnå, hvordan vet vi at den fungerer
- Nåværende nettside: adresse, hva fungerer og hva fungerer ikke
- Google-bedriftsprofil: finnes den, hvem har tilgang
- Konkurrenter og inspirasjon: lenker, hva liker dere
- Sider: hvilke sider trenger dere
- Oppdatering: hva tror dere at dere vil endre selv, og hvor ofte
- Tidsplan: ønsket lanseringsdato, og om noe styrer den (sesong, åpning, kampanje)

**Phase 7 (Launch)** contains a studio-only checklist (`visible_to_client: false`):
- Titles and meta descriptions on all pages, Open Graph image
- 301 redirects from old URLs if the client had a site before
- Sitemap and robots.txt, Search Console set up and sitemap submitted
- Analytics and cookie consent configured correctly
- All forms tested end to end, including where submissions arrive
- Accessibility check (keyboard, screen reader, contrast)
- Performance check on mobile
- DNS changed without breaking email (MX records verified)
- SSL working, www and non-www redirect correctly
- Google Business Profile links to the new site
- CMS access set up for the client, if relevant

## Admin features

- Dashboard with: projects grouped by "waiting on client", "waiting on me", "done"; open change requests; maintenance hours used this month per client; upcoming domain and hosting renewals
- Create client, invite client users by email
- Create project from a template
- Edit phases and steps on a project (add, remove, reorder, rename, change owner/type/visibility)
- Mark steps done; the next step becomes active automatically
- Add documents (upload file or paste link) and update their status
- Set staging URL, live URL, CMS URL; edit site details
- Manage maintenance plans and agreements
- Triage change requests: accept, decline, set billing type and estimate, log time, change status
- Write maintenance log entries
- Comment on steps and change requests, with internal comments only I can see
- See the activity log
- Build the handover page
- Export or delete a client's data (see Privacy)

## Client features

**During the project**
- **"Din tur" card at the top:** the one thing the client needs to do right now, with a clear action button. If nothing is waiting on them, say what I am working on and when they can expect the next update. This is the most important element in the whole app.
- Timeline showing all phases and the current position
- Approval steps: "Godkjenn" and "Be om endringer" with a comment field. Show the current round, e.g. "Runde 2 av 2". When the included rounds are used up, show a calm, neutral note that further rounds are billed according to the agreement, and notify me.
- Comment thread on each visible step, so questions stay in the hub instead of SMS
- Upload steps: drag-and-drop upload, list of what is already delivered
- Form steps: questionnaire, savable as draft
- Documents list, files list
- Staging link when available

**After launch**
- Link to the live site and, if the project has a CMS URL, a clear "Rediger nettsiden" button that opens the client's CMS (usually a customised Sanity Studio) in a new tab
- Handover page
- Maintenance agreement summary: plan, what is included, hours used this month out of included hours
- **"Meld inn endring":** a simple form with title, description, attachments and urgency. Clients without an agreement can also send requests; these are marked as needing a quote.
- List of their change requests with status and comment threads
- Maintenance log: what I have done on their site, by month

The hub is the client's single entry point to everything from me.

## Handover page (mini Brand Hub)

This is the seed of a full Brand Hub I will build later for branding clients, so design it to be extended.

Sections:
- Logo files (downloadable, multiple formats)
- Colours (swatches with hex values and copy-to-clipboard)
- Fonts (name, where to get them, sample)
- How to update the website (short guide, links, "Rediger nettsiden" button)
- Domain and hosting: who owns what, where it is registered, renewal dates (pulled from `site_details`)
- Important links and contacts
- Notes on where logins are kept. **Do not store passwords or secrets in this tool.** Only references like "stored in your password manager" or "sent separately".

The page should be viewable by logged-in client users, and optionally shareable through an unguessable public link that I can turn on and off.

## Notifications and reminders

Email via Resend, sent from my own domain. Every email links straight to the relevant place in the hub.

To the client:
- A step becomes their turn
- A change request changes status or gets a reply
- Reminder when a client step has been active longer than a configurable number of days (default 5), then at most once a week. Friendly, short, never nagging.

To me:
- Client approves, requests changes, uploads, comments, submits a form or sends a change request
- Urgent change request (send immediately)
- Revision rounds used up on an approval step
- Domain or hosting renewal within 30 days
- Maintenance hours for a client go above 80 % of the monthly allowance

I can turn reminders off per project.

## Privacy (GDPR)

- Database and storage in an EU region
- Store only the personal data the hub needs
- Admin can export all data for a client (JSON plus files as a zip) and permanently delete a client with all related data and files
- A short privacy notice page in Norwegian, linked from the client login and footer (I will write the final text; add a placeholder)
- File upload size limit and allowed file types, configurable

## Design

- Calm, clean, editorial look. Generous whitespace, strong typography, restrained colour. It should feel like a premium studio, not a generic SaaS dashboard.
- Mobile-first for the client side; many clients will open it from a link on their phone.
- Accessibility to WCAG 2.1 AA: semantic HTML, proper headings, labels on all inputs, visible focus states, full keyboard navigation, sufficient contrast, status not conveyed by colour alone. I test with NVDA and JAWS, so do this properly.

## Security

- RLS enabled on every table, with explicit policies. Clients can only read rows for their own client organisation and only where content is visible to the client. Internal comments, studio-only steps, internal notes and time entry details are never visible to clients (clients see only totals for hours used).
- Storage bucket policies that mirror the table policies.
- All writes go through server actions or route handlers that check the user's role.
- No secrets in client-side code. Provide `.env.example`.
- Write tests that prove a client cannot read another client's data, internal comments or hidden steps.

## Out of scope for version 1

Invoicing, payments, e-signing, task management beyond project steps and change requests, moodboards, AI features, team members, custom domains per client, multiple languages, automated uptime or security monitoring. Do not build these.

The hub is **not** a CMS. Client websites are edited in their own CMS (Sanity), which lives in each website's codebase. The hub only links to it. Do not build content editing for client websites into this app.

## How to work

1. **Plan first.** Before writing code, propose: the final data model, RLS policies, folder structure, and route map. Wait for my approval.
2. Build in the milestones below. Finish one before starting the next.
3. After each milestone: run lint, type check and tests, fix failures, then give me a short summary of what was built, what is left, and anything you were unsure about.
4. Keep commits small with clear messages.
5. If something in this brief is ambiguous or seems like a bad idea, say so and suggest an alternative instead of guessing.

## Milestones

1. **Foundation:** Next.js + Supabase setup (EU region), schema migrations, RLS policies, auth (magic link), seed script with the Website template, questionnaire, one maintenance plan, one demo client and project.
   *Done when:* I can log in as admin and as the demo client, and the RLS tests prove isolation.
2. **Admin core:** dashboard, create client, invite user, create project from template, edit phases and steps.
   *Done when:* I can create a real project from scratch without touching the database.
3. **Client portal:** project overview, "Din tur" card, timeline.
   *Done when:* the demo client sees exactly what they need to do next, on mobile and desktop.
4. **Steps:** uploads, approvals with revision rounds, comments, questionnaire, domain and access form, documents, staging link, activity log.
   *Done when:* the demo project can be walked through phases 1 to 6 end to end.
5. **Launch and handover:** launch checklist, site details, live and CMS links, handover page with optional public link.
   *Done when:* the demo project can be completed through phase 8.
6. **Maintenance:** plans, agreements, "Meld inn endring", change request triage, time entries, hours used, maintenance log, post-launch client view.
   *Done when:* the demo client can send a change request, I can handle it and log time, and the client sees status and hours used.
7. **Notifications and reminders:** all emails listed above, scheduled reminders, per-project reminder toggle.
8. **Privacy, tests and polish:** export and delete, privacy page, upload limits; Playwright tests for login, approval flow, upload flow, change request flow and client isolation; accessibility pass; empty states and error states.

Start with step 1 of "How to work": give me your plan.
