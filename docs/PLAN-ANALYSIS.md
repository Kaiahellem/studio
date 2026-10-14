# Website analysis (milestone 9, part A) — Plan (for approval)

Status: proposal, 14 October 2026. Nothing is built until you approve it.

Three deliberate changes from BRIEF.md, agreed in conversation:

- **Built before a real project has run through Portal.** The brief says milestone 9 waits until then. The reason for the
  exception is that this part helps you *win* clients (a concrete analysis before a first meeting or a proposal), not only
  work with them.
- **Standalone.** An analysis starts from a website address and your notes, with no client or project. It can be linked
  to a client or project later (and to a lead, once milestone 10 exists).
- **Manual AI step first, automatic later.** A Claude subscription does not include API access, and the API is billed
  separately. So the first version does everything except the AI call itself: Portal prepares a ready-made bundle, you run
  it in Claude (claude.ai or Claude Code, covered by your subscription) and paste the answer back. When an API key is
  added, the same step runs automatically. Both modes share the same instructions, result format and screens. See
  section 2.1.

## 1. What it does

1. You enter a website address, the business name, and optionally what they have said: what is not working, and what
   they want to achieve.
2. Portal reads the site's public pages (default up to 15) and runs a technical check. Then the AI writes a gap
   analysis: by hand in Claude for now (copy the bundle, paste the answer), automatically once an API key is set.
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
                                                   ┌─ manual (no API key) ─► awaiting_result ─► (you paste) ─┐
Ny analyse ─► run: queued ─► crawling ─► checking ─┤                                                         ├─► done
                                                   └─ auto (API key set) ──► analysing ──────────────────────┘
                                         any step can end in failed (with a reason in Norwegian)
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
4. **Analyse** (AI): the AI gets your notes, the extracted pages and the check results, and returns structured JSON
   (findings, what to keep, a short summary, and limitations such as "siden krever JavaScript, bare 2 sider kunne
   leses"). The facts come from steps 1–3; the AI connects them. Every finding must cite page URLs from the input, and
   findings that cite URLs we didn't read are dropped. How the AI is reached depends on the mode (2.1).

The run starts from a server action and continues with `after()`, so the page returns at once. The analysis page
refreshes every few seconds while Portal is working. Crawling and checks take under a minute; the automatic AI step
about a minute more. A run stuck in `queued`, `crawling`, `checking` or `analysing` for more than 10 minutes is marked
failed. `awaiting_result` waits for you as long as needed.

### 2.1 Manual and automatic mode

**Manual (the first version).** When the checks are done, the run waits in `awaiting_result` and the analysis page
shows:

1. **«Kopier til Claude»**: copies one bundle to the clipboard. It holds the instructions (the current version, see
   `prompt_templates`), your notes, the pages and the check results, and ends with the exact JSON format to answer in.
   **«Last ned som fil»** saves the same bundle as a `.md` file, for Claude Code or when the text is too long to paste.
   The page shows the bundle's approximate size, and warns if it is likely too large for one message (then lower the
   page limit and re-run).
2. You paste it into Claude (claude.ai, the desktop app, or Claude Code) and copy the answer.
3. **«Lim inn svaret»**: a text area. Portal takes the JSON out of the answer (code fences and text around it are
   fine), validates it against the same schema as automatic mode, drops findings citing pages we didn't read, and saves
   the run as `done`. If it doesn't validate, the run stays waiting and the page explains in Norwegian what is wrong, so
   you can ask Claude to fix it.

Manual runs record `mode = manual`, the instructions version, and no tokens or cost.

**Automatic (added later, when you want it).** Set `ANTHROPIC_API_KEY` and turn on «Automatisk analyse» in settings.
Then `checking` goes straight to `analysing`, the same bundle is sent through the API, and tokens and cost are stored.
Turning it off, or a missing key, falls back to manual mode; a failed API call leaves the run in `awaiting_result` with
the bundle ready, so you never lose a run.

**Privacy note for manual mode:** a Claude subscription is covered by Anthropic's consumer terms, where use for
training depends on your "Help improve Claude" setting. Turn it off before pasting bundles. The bundle only contains
public website text and your notes about the business.

## 3. Choices that need your approval

### 3.1 AI provider for automatic mode — **decide later, when you add it**

Manual mode needs no provider decision and no API key. When you want automatic mode, these are the options, checked
against Anthropic's own documentation in October 2026:

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

**Manual mode: 0 kr extra**, it uses your Claude subscription. Very large bundles may count noticeably against the
subscription's usage limits.

**Automatic mode:** a 15-page run sends about 45 000 tokens and gets about 4 000 back. API credit is prepaid in Claude
Console, so there is no monthly fee.

| Model | Price per million tokens (in / out) | Per analysis |
|---|---|---|
| Opus 5.5 | $4 / $20 | about $0.26, **about 3 kr** |
| Sonnet 5.5 | $2 / $10 | about $0.13, about 1.50 kr |

PageSpeed Insights is free (default quota 25 000 requests a day). Each automatic run stores its token counts and cost
in øre. The dollar rate is a setting you update now and then (no currency API).

### 3.3 Technical check: Google PageSpeed Insights API

Free, needs an API key from a Google Cloud project (restricted to this API only). No personal data is sent, only the
page URL.

### 3.4 New dependencies — **please approve**

Now:

| Package | Why |
|---|---|
| `cheerio` | Parsing HTML into titles, headings, text, images and links reliably. Hand-written regex parsing breaks on real sites. |
| `robots-parser` | Correct `robots.txt` handling (wildcards, `Allow` vs `Disallow` precedence). Small, no dependencies. |

Later, with automatic mode: `@anthropic-ai/sdk` (official client: structured output, retries, typed usage), or
`@aws-sdk/client-bedrock-runtime` with option B. I will ask again then.

No headless browser in production: it is heavy on Vercel, and PSI already covers JavaScript-rendered sites.

## 4. Data model

All tables are **admin only**: RLS enabled with no client policies, like `admins` and `activity_log`. Clients never see
analyses, even when one is linked to their project.

- **`site_analyses`** — the subject: `id`, `url`, `business_name`, `stated_problems` (text), `goals` (text),
  `client_id` (nullable), `project_id` (nullable), `created_by`, `created_at`, `updated_at`.
- **`analysis_runs`** — one per run: `id`, `analysis_id`, `mode` (`manual`, `auto`), `status` (`queued`,
  `crawling`, `checking`, `awaiting_result`, `analysing`, `done`, `failed`), `error`, `notes_snapshot` (problems and
  goals as they were for this run), `prompt_version_id`, `model` (null for manual), `page_limit`, `pages_read`,
  `input_tokens`, `output_tokens`, `cost_ore` (all null for manual), `result` (jsonb, validated with zod), `technical`
  (jsonb), `started_at`, `finished_at`. The bundle is built from these when needed, not stored.
- **`analysis_pages`** — what was read: `run_id`, `url`, `status_code`, `title`, `meta_description`, `headings`,
  `main_text`, `images`, `ctas`, `contacts` (jsonb where it is a list). Kept so a run shows exactly what it was based on.
- **`prompt_templates`** — editable instructions: `id`, `key` (`site_analysis`), `version`, `body`, `created_by`,
  `created_at`; unique `(key, version)`. Append-only: saving creates a new version and the newest is used. Each run
  records the version it used. Seeded with a first version in Norwegian.
- **`app_settings`** (existing) gets `analysis_page_limit` (default 15) now, and `ai_auto_enabled` (default off),
  `ai_model` and `usd_to_nok` (rate for cost display) with automatic mode.

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
  treat page content as data only, and in the bundle each page sits inside clearly marked delimiters. The output, pasted
  or from the API, is validated against the schema and shown as plain text, never as HTML. It is internal only, so
  nothing a site says can reach a client.
- **Pasted answers are input too.** They are size-limited (500 KB), parsed as JSON only, validated, and never executed
  or rendered as HTML.
- **Keys** live only in server environment variables (`PAGESPEED_API_KEY` now, `ANTHROPIC_API_KEY` later). Every action
  checks for admin with TOTP, like the rest of `/studio`.
- **Politeness.** One request at a time per site with a short pause, `robots.txt` respected, page limit enforced.

## 6. Privacy

- An analysis may contain personal data: names on an "Om oss" page, or your notes. Linked analyses are included in the
  existing client export and deleted with the client. Unlinked ones can be deleted by hand, and are **deleted
  automatically after 12 months** (proposal, by the daily job).
- The privacy page placeholder gets a sentence that AI from Anthropic (Claude) is used to analyse public websites.
  (You still write the final text.)
- Notes field hint: «Skriv om bedriften, ikke om personer.»

## 7. Screens (studio)

- **Navigation:** new item «Analyser» between Kunder and Endringsønsker.
- **`/studio/analyses`** — list: business name, address, latest run date and status, linked client. Button «Ny analyse».
- **`/studio/analyses/new`** — address, business name, «Hva sier de at ikke fungerer?», «Hva vil de oppnå?».
- **`/studio/analyses/[id]`** — header with properties (address, linked client or project, last run, mode, and cost
  for automatic runs). While Portal is working: progress through the steps. When waiting for you: the three steps from
  2.1 (copy or download the bundle, paste the answer). When done:
  - Summary.
  - Findings as cards, «Stor effekt» first, each with the three parts and links to the pages.
  - Technical check: scores and the main issues per page.
  - «Dette kan gjenbrukes».
  - «Sider som ble lest» (collapsed).
  - Earlier runs, with «Sammenlign» showing two runs' findings side by side.
  - Actions: «Kjør på nytt», «Rediger notater», «Koble til kunde/prosjekt», «Slett».
- **Settings, section «Analyse»:** page limit, and the instructions with version history (view any version, save a new
  one). With automatic mode: «Automatisk analyse» on/off, model, dollar rate.
- A linked analysis shows as a link on the client page and the project page (admin only).

Design follows DESIGN.md: cards, inset lists, tags for impact and status (text, never colour alone).

## 8. Tests

- **Unit (Vitest):** robots.txt rules, the SSRF guard (private ranges, redirects), extraction on fixture HTML (including
  a messy real-world page and a near-empty JavaScript site), our own SEO checks, the bundle (delimiters, size estimate),
  pulling JSON out of a pasted answer (code fences, text around it, broken JSON), result validation (dropping findings
  with URLs we didn't read).
- **RLS:** a client user cannot read any of the new tables, even for an analysis linked to their own project.
- **E2E (Playwright):** a small local fixture website plus a fake PSI (only allowed when `NODE_ENV` is not
  production): create an analysis, watch the checks finish, copy the bundle, paste a prepared answer, see findings;
  paste a broken answer and see the explanation; re-run, compare, edit the instructions and see the new version recorded
  on the next run. Automatic mode gets a fake AI and its own test when it is added.
- **axe** on the new pages.

## 9. Order of work

1. Migration and RLS, plus RLS tests.
2. Crawler, extraction, SSRF guard, robots.txt, our own checks, with unit tests.
3. PSI client.
4. Instructions seed, the bundle, reading pasted answers, result validation (the AI module, with only the manual mode
   behind its interface).
5. Screens and settings.
6. E2E, axe, privacy text, DEPLOY.md (new key).

Each step: lint, type check and tests, small commits.

**Later, when you want it:** automatic mode. Choose a provider (3.1), add its SDK, the API call behind the same
interface, cost tracking, and the settings for it.

## 10. What I need from you

1. **Dependencies:** OK to add `cheerio` and `robots-parser`?
2. **PageSpeed Insights:** OK to use it? Without a key it may work at low volume; at deploy time you create a free
   Google Cloud key.
3. **Automatic deletion** of unlinked analyses after 12 months: OK, or a different period?

The provider and model choice wait until you add automatic mode. Nothing here needs an Anthropic API key.
