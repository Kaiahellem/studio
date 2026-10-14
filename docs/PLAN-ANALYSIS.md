# Website analysis (milestone 9, part A) — Plan (for approval)

Status: proposal, 14 October 2026. Nothing is built until you approve it.

Two deliberate changes from BRIEF.md, agreed in conversation:

- **Built before a real project has run through Portal.** The brief says milestone 9 waits until then. The reason for the
  exception is that this part helps you *win* clients (a concrete analysis before a first meeting or a proposal), not only
  work with them.
- **Standalone.** An analysis starts from a website address and your notes, with no client or project. It can be linked
  to a client or project later (and to a lead, once milestone 10 exists).

## 1. What it does

1. You enter a website address, the business name, and optionally what they have said: what is not working, and what
   they want to achieve.
2. Portal reads the site's public pages (default up to 15), runs a technical check, and asks the AI for a gap analysis.
3. You get, in Norwegian:
   - **Findings** ordered by expected impact. Each one says what the client said, what the site does today, and what
     you should do, with links to the pages it is based on.
   - **Technical check**: mobile performance, accessibility, SEO basics.
   - **What to keep**: text and images worth reusing, with links to where they are.
   - **Pages read**, so you can see exactly what the analysis was based on.
4. You can re-run it (for example after a conversation). Each run is saved with a date, the instructions version and the
   cost, and two runs can be shown side by side.

**Not in this version** (from the brief, deliberately left for later): one-click pre-filled phase 3 content, and the
summary that can be published to the client. Both need real projects to be useful and fit on top of this without
changes.

## 2. How a run works

```
Ny analyse ─► run: queued ─► crawling ─► checking ─► analysing ─► done
                                                          └──────► failed (with a reason in Norwegian)
```

1. **Crawl** (our own code, no AI): fetch `robots.txt`, then the front page, then follow internal links breadth-first up
   to the page limit. Same host only (`www.` and bare domain count as the same). Only `text/html`, max 2 MB per page,
   10 s timeout, max 5 redirects. Identifies itself as `PortalBot/1.0 (+https://<your domain>/bot)`. Never logs in,
   submits forms or follows `mailto:`, `tel:` or file links.
2. **Extract** (our own code): per page — URL, status, title, meta description, headings, main text (nav/footer
   stripped, capped at ~12 000 characters), images (src, alt, size if given), calls to action (buttons and prominent
   links), contact methods (`tel:`, `mailto:`, forms, booking links), and whether phone numbers are clickable.
3. **Technical check**:
   - **Our own checks** on every page: title and meta description present and length, one `h1`, heading order, images
     without alt text, clickable phone numbers, HTTPS and redirect from HTTP, viewport meta, Open Graph image,
     `LocalBusiness` structured data.
   - **PageSpeed Insights** (Google's API, mobile strategy) on the front page and up to two other key pages (contact,
     and the most-linked service page): performance, accessibility, SEO and best-practice scores plus the top issues.
     PSI renders JavaScript, so it also works on sites our crawler reads poorly.
4. **Analyse** (AI, one call): the model gets your notes, the extracted pages and the check results, and returns
   structured JSON (findings, what to keep, a short summary, and limitations such as "siden krever JavaScript, bare 2
   sider kunne leses"). The facts come from steps 1–3; the AI connects them. Every finding must cite page URLs from
   the input, and findings that cite URLs we didn't read are dropped.

The run starts from a server action and continues with `after()`, so the page returns at once. The analysis page
refreshes every few seconds while a run is in progress. Expected time: 1–2 minutes. A run still not finished after
10 minutes is marked failed.

## 3. Choices that need your approval

### 3.1 AI provider — **you decide between two options**

Checked against Anthropic's own documentation, October 2026:

| | **A. Anthropic API directly** (recommended) | **B. Claude through AWS Bedrock, EU region** |
|---|---|---|
| Where it runs | Global routing or US only. **No EU option** on the first-party API today; data at rest is stored in the US. | In an EU AWS region (Bedrock EU inference). I would confirm the chosen model is offered there before building. |
| Training | No training on API inputs/outputs (Commercial Terms). | AWS does not share inputs with model providers or use them for training. |
| Retention | Deleted within 30 days by default (longer only for flagged policy violations). | Not stored by Bedrock beyond processing by default. |
| Legal basis for transfer | Anthropic's DPA with standard contractual clauses (data leaves the EU). | Stays in the EU. |
| Setup | One API key. | An AWS account, IAM user, model access request, and EU inference profile. More to set up and maintain. |
| Price | Standard. | Bedrock's own regional prices, roughly similar. |

**My recommendation: A**, because of what is sent. An analysis sends a business's *public* website text plus your
notes. That is low risk, as long as your notes are about the business, not about people. Portal will remind you of that
under the notes field. If you would rather keep everything in the EU (or later send questionnaire answers from clients
for part B), choose B. Switching later is a contained change in one module (`src/lib/ai/`).

**Model:** Claude Opus 5.5 (`claude-opus-5-5`) by default, changeable in settings. Sonnet 5.5 is cheaper but the gap
analysis is where quality matters, and the cost difference per analysis is a couple of kroner.

### 3.2 Cost per analysis (estimate)

A 15-page run sends about 45 000 tokens and gets about 4 000 back.

| Model | Price per million tokens (in / out) | Per analysis |
|---|---|---|
| Opus 5.5 | $4 / $20 | about $0.26, **about 3 kr** |
| Sonnet 5.5 | $2 / $10 | about $0.13, about 1.50 kr |

PageSpeed Insights is free (default quota 25 000 requests a day). Each run stores its token counts and cost in øre. The
dollar rate is a setting you update now and then (no currency API).

### 3.3 Technical check: Google PageSpeed Insights API

Free, needs an API key from a Google Cloud project (restricted to this API only). No personal data is sent, only the
page URL.

### 3.4 New dependencies — **please approve**

| Package | Why |
|---|---|
| `@anthropic-ai/sdk` | Official client for the AI call (structured output, retries, typed usage). With option B, `@aws-sdk/client-bedrock-runtime` instead. |
| `cheerio` | Parsing HTML into titles, headings, text, images and links reliably. Hand-written regex parsing breaks on real sites. |
| `robots-parser` | Correct `robots.txt` handling (wildcards, `Allow` vs `Disallow` precedence). Small, no dependencies. |

No headless browser in production: it is heavy on Vercel, and PSI already covers JavaScript-rendered sites.

## 4. Data model

All tables are **admin only**: RLS enabled with no client policies, like `admins` and `activity_log`. Clients never see
analyses, even when one is linked to their project.

- **`site_analyses`** — the subject: `id`, `url`, `business_name`, `stated_problems` (text), `goals` (text),
  `client_id` (nullable), `project_id` (nullable), `created_by`, `created_at`, `updated_at`.
- **`analysis_runs`** — one per run: `id`, `analysis_id`, `status` (`queued`, `crawling`, `checking`, `analysing`,
  `done`, `failed`), `error`, `notes_snapshot` (problems and goals as they were for this run), `prompt_version_id`,
  `model`, `page_limit`, `pages_read`, `input_tokens`, `output_tokens`, `cost_ore`, `result` (jsonb, validated with
  zod), `technical` (jsonb), `started_at`, `finished_at`.
- **`analysis_pages`** — what was read: `run_id`, `url`, `status_code`, `title`, `meta_description`, `headings`,
  `main_text`, `images`, `ctas`, `contacts` (jsonb where it is a list). Kept so a run shows exactly what it was based on.
- **`prompt_templates`** — editable instructions: `id`, `key` (`site_analysis`), `version`, `body`, `created_by`,
  `created_at`; unique `(key, version)`. Append-only: saving creates a new version and the newest is used. Each run
  records the version it used. Seeded with a first version in Norwegian.
- **`app_settings`** (existing) gets `ai_enabled`, `ai_model`, `analysis_page_limit` (default 15) and
  `usd_to_nok` (rate for cost display).

The result JSON shape (validated before saving):

```ts
{
  summary: string;                         // 2–3 sentences
  findings: {
    title: string;
    clientSaid: string | null;             // null when the finding comes from the site alone
    siteToday: string;
    recommendation: string;
    impact: "high" | "medium" | "low";
    sourceUrls: string[];                  // must be pages we read
  }[];
  keep: { kind: "text" | "image"; description: string; excerpt?: string; sourceUrl: string }[];
  limitations: string[];
}
```

## 5. Safety

- **SSRF guard.** The server fetches addresses you type, so before each request (and after each redirect) it resolves
  the host and refuses private, loopback, link-local and metadata addresses (for example `127.0.0.1`, `10.x`,
  `169.254.169.254`). Only `http`/`https` on ports 80 and 443.
- **Website text is untrusted.** A page could contain text written to steer an AI. The instructions tell the model to
  treat page content as data only. The output is validated against the schema and shown as plain text, never as HTML.
  It is internal only, so nothing a site says can reach a client.
- **Keys** live only in server environment variables (`ANTHROPIC_API_KEY`, `PAGESPEED_API_KEY`). Every action checks
  for admin with TOTP, like the rest of `/studio`.
- **Politeness.** One request at a time per site with a short pause, `robots.txt` respected, page limit enforced.

## 6. Privacy

- An analysis may contain personal data: names on an "Om oss" page, or your notes. Linked analyses are included in the
  existing client export and deleted with the client. Unlinked ones can be deleted by hand, and are **deleted
  automatically after 12 months** (proposal, by the daily job).
- The privacy page placeholder gets a sentence that AI from the chosen provider is used to analyse public websites.
  (You still write the final text.)
- Notes field hint: «Skriv om bedriften, ikke om personer.»

## 7. Screens (studio)

- **Navigation:** new item «Analyser» between Kunder and Endringsønsker.
- **`/studio/analyses`** — list: business name, address, latest run date and status, linked client. Button «Ny analyse».
- **`/studio/analyses/new`** — address, business name, «Hva sier de at ikke fungerer?», «Hva vil de oppnå?».
- **`/studio/analyses/[id]`** — header with properties (address, linked client or project, last run, cost). While a
  run is going: progress through the steps. When done:
  - Summary.
  - Findings as cards, «Stor effekt» first, each with the three parts and links to the pages.
  - Technical check: scores and the main issues per page.
  - «Dette kan gjenbrukes».
  - «Sider som ble lest» (collapsed).
  - Earlier runs, with «Sammenlign» showing two runs' findings side by side.
  - Actions: «Kjør på nytt», «Rediger notater», «Koble til kunde/prosjekt», «Slett».
- **Settings, section «Analyse»:** AI on/off, model, page limit, dollar rate, and the instructions with version history
  (view any version, save a new one).
- A linked analysis shows as a link on the client page and the project page (admin only).

Design follows DESIGN.md: cards, inset lists, tags for impact and status (text, never colour alone).

## 8. Tests

- **Unit (Vitest):** robots.txt rules, the SSRF guard (private ranges, redirects), extraction on fixture HTML (including
  a messy real-world page and a near-empty JavaScript site), our own SEO checks, result validation (dropping findings
  with URLs we didn't read), cost in øre.
- **RLS:** a client user cannot read any of the new tables, even for an analysis linked to their own project.
- **E2E (Playwright):** a small local fixture website plus a fake AI and fake PSI (only allowed when `NODE_ENV` is not
  production): create an analysis, watch it finish, see findings, re-run, compare, edit the instructions and see the new
  version recorded on the next run.
- **axe** on the new pages.

## 9. Order of work

1. Migration and RLS, plus RLS tests.
2. Crawler, extraction, SSRF guard, robots.txt, our own checks, with unit tests.
3. PSI client.
4. AI module (provider behind one interface), instructions seed, result validation, cost.
5. Screens and settings.
6. E2E, axe, privacy text, DEPLOY.md (new keys).

Each step: lint, type check and tests, small commits.

## 10. What I need from you

1. **Provider:** A (Anthropic API, recommended) or B (Bedrock EU).
2. **Dependencies:** OK to add `@anthropic-ai/sdk` (or the Bedrock SDK), `cheerio` and `robots-parser`?
3. **PageSpeed Insights:** OK to use it (you will create a free Google Cloud key at deploy time)?
4. **Automatic deletion** of unlinked analyses after 12 months: OK, or a different period?
5. **Model:** Opus 5.5 as default?

For development and tests you need no keys: the fake AI and fake PSI cover that. A real run needs an Anthropic API key
(with prepaid credit) on your machine.
