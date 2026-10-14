# Portal — Build Brief

You are helping me build Portal, a client portal for my freelance web design and development business. I am a solo freelancer based in Norway, and my clients are mainly small service businesses. It has two sides: an admin side for me (clients, projects, maintenance and leads) and a client side for my clients. It is for my own use, not a product to sell. In the UI and in code, the app is called "Portal". Read this entire brief before writing any code.

## The problem

Today, everything around a client project is scattered: the proposal is in one email, the contract in another, the invoice in a third, content arrives on WeTransfer, feedback comes over SMS, and change requests after launch arrive whenever and however. Neither I nor the client has one place to see where things stand and what happens next.

## The goal

One place per client where both I and the client can see:
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
- `review_rounds` — one per round on an approval step: round number, instructions to the client ("what to look at"), one or more review links (each with a label, e.g. "Forside", "Tjenesteside"), optional snapshot files (screenshots or PDF), created by, created at. Locked once the client has responded: it can no longer be edited, so it always shows exactly what the client saw.
- `approvals` — step, review round, user, decision (`approved` / `changes_requested`), comment, timestamp. Never edited or deleted; this is the record.
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

Invoicing and e-signing happen in external tools (Fiken and a signing service). Portal only stores the resulting PDF or a link to it. Portal does not bill anyone; it only shows agreements and usage.

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
- Start a review round on an approval step: write instructions to the client, add review links (Vercel preview, or a Figma link with view access), and attach snapshots. The client is notified only when I publish the round.
  - Review links must point to a fixed version. If a link looks like a Vercel branch alias (contains `-git-`) or another URL that changes over time, warn me and ask for the unique deployment URL instead.
  - Make snapshots easy: allow several images or a PDF per round, uploaded by drag-and-drop.
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
- Approval steps: my instructions for what to look at shown first, then the review links (opening in a new tab) and snapshots, then "Godkjenn" and "Be om endringer" with a comment field. Earlier rounds stay visible below, collapsed, with what was shown and what was answered. Show the current round, e.g. "Runde 2 av 2". When the included rounds are used up, show a calm, neutral note that further rounds are billed according to the agreement, and notify me.
- Comment thread on each visible step, so questions stay in Portal instead of SMS
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

Portal is the client's single entry point to everything from me.

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

Email via Resend, sent from my own domain. Every email links straight to the relevant place in Portal.

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
- Store only the personal data Portal needs
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

Invoicing, payments, e-signing, task management beyond project steps and change requests, moodboards, team members, custom domains per client, multiple languages, automated uptime or security monitoring. Do not build these.

AI features are not part of version 1, but they are planned as milestone 9 (see "After version 1"). Design the form system in version 1 so that milestone 9 can be added without restructuring it.

Portal is **not** a CMS. Client websites are edited in their own CMS (Sanity), which lives in each website's codebase. Portal only links to it. Do not build content editing for client websites into this app.

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

## After version 1

Do not start this until milestones 1–8 are done and I have used Portal on at least one real project.

### 9. AI-assisted discovery

**Goal:** understand the client's current website and how it relates to what they say is not working and what they want, and make the kickoff questionnaire easier for the client to answer — without the AI ever answering on the client's behalf.

Build part A first. Part B comes after part A works.

#### Part A: Analysis of the current website

1. **Website address from either side.** I can enter the client's current website when I create the project, and the client can also enter it in the questionnaire.
2. **Read the current site.** The AI reads the site's public pages, starting with the front page and following internal links, up to a configurable limit (default 15 pages). Respect robots.txt. Never log in, submit forms or change anything on the client's site. Record for each page: URL, title, headings, main text, images, calls to action, and contact methods.
3. **Technical check.** Run a basic check of mobile performance, accessibility and SEO basics (titles, meta descriptions, headings, alt text, clickable phone numbers, HTTPS). Propose a tool for this, for example Google's PageSpeed Insights API, and wait for my approval.
4. **Gap analysis for me (internal).** Connect three things: what the client says is not working, what they want to achieve, and what the current site actually does. Each finding states what the client said, what the site does today, and what I should do about it. Example: "The client says they get too few enquiries. The contact form is only on the contact page, and the phone number is not clickable on mobile. Put contact options on every service page and in the header on mobile." Order findings by expected impact.
5. **What to keep.** List text and images from the current site that can be reused as a starting point, with links to where they come from. I can turn selected items into pre-filled content in phase 3 with one click, so the client only has to confirm or replace them instead of delivering everything again.
6. **Optional summary for the client.** A short, positive version in Norwegian ("Dette tar vi med videre" / "Dette gjør vi bedre"). It is internal by default; I can review, edit and then publish it to the client's project.
7. **Re-run.** I can re-run the analysis, for example after the client has answered the questionnaire. Each run is saved with a date, so I can compare.

**Editable instructions.** The instructions the AI uses for the analysis and the gap analysis are stored as editable, versioned prompt templates in an admin settings page, not hardcoded. I expect to adjust them after using them with real clients. Each saved analysis records which template version produced it.

#### Part B: Help with the questionnaire

1. **Pre-fill from existing sources.** When I create a project, I can enter the client's current website and Google Business Profile URL. The AI reads them and writes draft answers into the questionnaire. Each pre-filled answer is clearly marked as a suggestion ("Forslag basert på nettsiden deres") and the client must confirm or edit it.
2. **Follow-up questions.** When the client saves an answer that is short or vague, the AI may suggest one concrete follow-up question shown under the field. At most one follow-up per question. The client can ignore it.
3. **Answer by voice.** On any question, or for the whole questionnaire, the client can record a voice message instead of typing. It is transcribed and the AI places the content into the right fields as suggestions for the client to review. Delete the audio file after transcription unless I choose to keep it.
4. **Examples when stuck.** A "Vis eksempel" button on each question that shows a short example answer for a similar fictional business. Never pre-fill the field with it.
5. **Summary for me.** When the questionnaire is submitted, the AI writes an internal brief for me: summary of the business, target audience, suggested sitemap, suggested tone of voice, the most important findings from the gap analysis in part A, and a list of missing content. I can turn the missing content list into upload steps in phase 3 with one click. This brief is internal and never shown to the client.

Rules:
- The client always sees and approves everything the AI writes before it is submitted. Nothing the AI generates is saved as the client's answer without their confirmation.
- Store the origin of every answer: `client`, `ai_suggestion`, or `ai_suggestion_edited`. Show me the origin in the admin view.
- The normal questionnaire must work fully without AI. If the AI call fails or is turned off, the client just sees the regular form.
- AI can be turned on or off per project.
- All AI-generated text shown to clients is in Norwegian bokmål.
- Before building, propose which AI provider and speech-to-text provider to use, with a short note on their data handling terms (EU processing, no training on our data, retention). Wait for my approval.
- All AI calls happen server-side. No API keys in the browser.
- Log token usage per project so I can see what it costs, shown in NOK.
- Update the privacy page placeholder to mention that AI is used and which provider processes the data.

*Part A done when:* I enter a real small-business website, get a gap analysis that connects the client's stated problems and goals to concrete findings on the site, and can turn reusable content into pre-filled phase 3 items.

*Part B done when:* a demo client with an existing website gets a pre-filled questionnaire, can answer one question by voice, confirms the suggestions, submits, and I receive an internal brief with a missing-content list that can be turned into upload steps.

### 10. Leads

**Goal:** keep track of potential clients in the admin side of Portal, and get a short, scored list of new candidates every morning. Finding leads is automated; contacting them is not.

Part A can be built any time after milestone 2. Part B needs milestone 9 part A, because it reuses the website analysis.

#### Part A: Lead list

- `leads` — business name, org number, website, area, industry, source (`manual`, `brreg`, `referral`, `inbound`), status (`new`, `reviewing`, `contacted`, `in_dialogue`, `won`, `not_relevant`), score, score reason, notes, next step with date, created and updated timestamps
- `lead_contacts` — contact person, role, phone, email, and where the information came from (only business contact details that are publicly listed by the business or given to me)
- `lead_activities` — dated log of what happened: channel (phone, email, meeting, LinkedIn, other) and a note
- Admin only. RLS must make leads completely invisible to client users.
- Views: "Nye leads" inbox, a list with filters for status, area, industry and score, and a lead page with analysis, contacts and activity log.
- Next-step dates show up on the admin dashboard under "I dag" and "Forfalt".
- **Convert to client:** one click creates the client (and optionally a project from a template), carries over name, org number, website, contacts and the website analysis, and marks the lead as `won`.

#### Part B: Daily lead discovery

1. **Source: Enhetsregisteret** (Brønnøysundregistrene's open API). Before building, read the API documentation and terms of use, and summarise for me what can be filtered on and what the terms allow.
2. **Search profiles** that I can edit in admin settings: industry codes (næringskoder), municipalities, organisation forms, and maximum age of the registration (e.g. registered in the last 60 days). Several profiles can be active, e.g. "Nye frisører i Oslo" and "Håndverkere i Ringerike".
3. **Nightly job.** Fetch matching units, de-duplicate on org number, and skip anything that is already a lead, a client, or that I have marked `not_relevant`. Skip units that are deleted, bankrupt or under liquidation. If the register exposes any reservation against marketing, respect it and skip those units.
4. **Enrichment.** Use the website from the register if it is listed. If not, mark the lead as "Ingen nettside funnet" rather than guessing. For leads with a website, run a light version of the milestone 9 part A analysis: front page only plus the technical check.
5. **Scoring.** The AI gives each lead a score from 0 to 100 and one sentence in Norwegian explaining why, based on: no website or a weak one, how recently the business was registered, and how well it fits my search profile. The scoring instructions are an editable, versioned prompt template, like the analysis templates.
6. **Limits and cost.** A configurable maximum number of new leads per day (default 20). Log AI and API usage per run and show the cost in NOK.
7. **Morning view.** The dashboard shows "Nye leads (n)" sorted by score. Optionally a short daily email digest to me with the top five.
8. **Message suggestion.** On a lead, I can ask the AI to suggest a short, personal first message based on the findings. It is a suggestion I copy and adapt myself. Portal never sends anything to leads.

Rules:
- **No automated outreach of any kind.** Portal does not email, text or call leads.
- Show a short, neutral note on the lead page that e-mail marketing to sole proprietorships (enkeltpersonforetak) generally requires prior consent under the Norwegian Marketing Control Act, and that I choose the channel. I will check the exact wording with Forbrukertilsynet's guidance.
- Store only what is needed: data from the public register and the business's own website. Never scrape directories or sites whose terms forbid it, and respect robots.txt.
- Leads with status `not_relevant`, or with no activity for a configurable period (default 12 months), are deleted automatically. Leads can be exported and deleted like clients.
- Update the privacy page placeholder to describe how lead data is collected and kept.

*Part A done when:* I can add a lead by hand, log activity, set a next step that shows on the dashboard, and convert the lead to a client with a project.

*Part B done when:* a nightly run with a test search profile produces new, de-duplicated, scored leads with a reason for each, the cost is shown in NOK, and nothing is ever sent to a lead.

Start with step 1 of "How to work": give me your plan.
