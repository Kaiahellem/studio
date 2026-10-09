# Portal — Design Guide

This file defines the visual design and the Norwegian conventions of Portal. It replaces the "Design" section in BRIEF.md. If the two disagree, follow this file. Read it before building or changing any UI. All values here have been checked for contrast; do not replace them with values from other sources.

## Direction: Quiet Studio

An editorial, quiet, document-like workspace. It should feel like high-end stationery combined with the calm of a well-kept personal wiki: reassuring, deliberate and free of distraction.

Principles:
- **Document as canvas.** Pages read top to bottom like documents. Project status, deliverables and feedback are presented as readable pages, not as dashboards full of cards.
- **Quiet precision.** Clarity comes from typography, hairline dividers and generous space, not from boxes, colour or shadows.
- **Restrained colour.** Warm off-white and dark ink carry the whole interface. Colour is used only for status and callouts.
- **Flat.** No gradients. Depth comes from tone, not shadow, except on floating menus and dialogs.
- **Norwegian first.** Language, formats and conventions follow Norwegian practice everywhere (see "Norwegian users").

## Colour tokens

Define all colours as CSS variables (and in the Tailwind theme) and never use raw hex values in components.

### Surfaces, text and lines

| Token | Light | Dark | Use |
|---|---|---|---|
| `--canvas` | `#FAF9F6` | `#18191B` | App background and outer page area |
| `--sheet` | `#FFFFFF` | `#202124` | Reading sheet, menus, dialogs, cards |
| `--subtle` | `#F3F4F6` | `#2A2B2E` | Sidebar, neutral callouts, hover |
| `--active` | `#E9EAEC` | `#323337` | Pressed or selected rows |
| `--ink` | `#1E232A` | `#E8E6E1` | Headings, body text, active navigation |
| `--ink-secondary` | `#5F6571` | `#A4A7AE` | Metadata, timestamps, helper text, placeholders |
| `--ink-disabled` | `#8C9099` | `#7A7E86` | Disabled text and purely decorative elements only |
| `--hairline` | `#E5E7EB` | `rgba(255,255,255,0.08)` | Dividers and decorative borders |
| `--control-border` | `#80858E` | `#7A7E86` | Borders on inputs, checkboxes, radio buttons, secondary buttons |
| `--focus` | `#4A6572` | `#AFC6D2` | Focus ring |

`--hairline` is for decoration only. Anything the user must be able to see to operate it (input fields, checkboxes, secondary buttons) uses `--control-border`, which meets the 3:1 requirement for interface components.

### Buttons

| Token | Light | Dark |
|---|---|---|
| `--primary-bg` | `#1E232A` | `#E8E6E1` |
| `--primary-bg-hover` | `#374151` | `#FFFFFF` |
| `--primary-text` | `#FFFFFF` | `#1E232A` |

### Status

Status is always shown as text in a tag, never by colour alone.

| Status | Light text / background | Dark text / background | Use |
|---|---|---|---|
| Neutral | `#5F6571` / `#F3F4F6` | `#C9C9C6` / `#2E2F33` | Pending, not started |
| Slate (active) | `#4A6572` / `#EEF3F6` | `#AFC6D2` / `#23323B` | In progress, in review, "Din tur" |
| Sage (done) | `#5B6B5C` / `#EDF3EE` | `#B7CAB8` / `#263027` | Approved, delivered, done |
| Amber (attention) | `#8A5C2C` / `#FAF4EC` | `#DDB685` / `#3A2F22` | Waiting, needs attention, rounds almost used |
| Brick (critical) | `#9F2F2D` / `#FDEBEC` | `#F2B8B5` / `#3E2424` | Changes requested, urgent, errors |

Every text/background pair in this file has been checked against WCAG 2.1 AA (4.5:1 for text, 3:1 for interface components). If you add a new colour, check it the same way.

## Typography

Fonts, loaded with `next/font` so they are self-hosted (no requests to Google from the user's browser):
- **Hanken Grotesk** for everything the client reads.
- **JetBrains Mono** only for technical metadata on the admin side: IDs, version numbers, timestamps in dense tables, cost figures in logs. Never on the client side.

| Style | Size / line height | Weight | Letter spacing | Use |
|---|---|---|---|---|
| Title XL | 40/48 (mobile 30/38) | 600 | −0.03em | One page title per page |
| Title L | 28/36 | 600 | −0.02em | Section headings |
| Title M | 20/28 | 600 | −0.015em | Sub-sections |
| Title S | 16/24 | 600 | −0.01em | Groups, list headings |
| Body L | 17/28 | 400 | −0.005em | Long reading (handover guide, instructions) |
| Body | 16/26 | 400 | 0 | Default body text, client side |
| Body compact | 15/24 | 400 | 0 | Dense admin tables only |
| Small | 13/20 | 400 | 0 | Metadata, helper text |
| Label | 13/20 | 500 | 0 | Tags, property labels, client side |
| Mono | 12/16 | 500 | 0.02em | Admin metadata only |

Rules:
- Minimum text size is 13px for Hanken Grotesk and 12px for mono.
- **All inputs, selects and textareas use 16px** so mobile browsers do not zoom in.
- No uppercase text on the client side. Mono labels on the admin side may use small uppercase sparingly.
- Weights: 400, 500 and 600 only.

## Layout and spacing

- 8pt rhythm. Tokens: `space-xs` 4px, `space-sm` 8px, `space-md` 16px, `space-lg` 24px, `space-xl` 40px, plus 64px between major sections.
- Reading sheet max width 840px (760px for pure text pages). Admin tables and the dashboard may use up to 1100px.
- Page margins: 48px desktop, 32px tablet, 16px mobile.

**App shell**
- **Desktop (≥1024px):** collapsible index sidebar, 260px, on `--subtle`. Main area on `--canvas`, with the page content on a `--sheet` reading sheet framed by a 1px `--hairline` border.
- **Tablet (768–1023px):** the sidebar becomes a slide-over drawer.
- **Mobile (≤767px):** full-bleed sheet with 16px margins. A slim top bar with the page title and a menu button that opens navigation as a full-height sheet.
- **Client side:** the sidebar shows only the client's own projects and sections: Oversikt, Dokumenter, Filer, Endringer, Overlevering. With one project, skip the project level.

## Elevation and shape

- Canvas is the lowest layer. Sheets and cards sit flush on it with a 1px `--hairline` border.
- Hover and selection change tone (`--subtle`, `--active`), never lift.
- Floating menus and popovers: `--sheet`, 1px `--hairline` border, shadow `0 4px 12px rgba(30,35,42,0.06), 0 1px 2px rgba(30,35,42,0.04)`.
- Radius: 4px for inputs, buttons, tags, callouts and cards; 8px for panels, dialogs and drawers. No pill shapes.

## Components

**Breadcrumbs.** Above the page title. Small text, separated by `/` in `--hairline`. Parent links in `--ink-secondary`, current page in `--ink`. Hidden on mobile when it would wrap; use a back link instead.

**Page header.** Title XL, then a properties block directly under it: two columns of label and value, like document properties. For a project: Status, Fase, Neste steg, Ønsket lansering, Forhåndsvisning. Labels in Label style and `--ink-secondary`, values in Body. No box around it.

**"Din tur" callout.** The most important element in Portal. A callout on the slate tint background with a 1px slate border, 4px radius, 16px padding, a 16px icon on the left, a short Title S heading, one sentence, and one primary button. When nothing is waiting on the client, it becomes a neutral callout that says what I am working on and when they will hear from me, with no button. Never more than one callout at the top of a page.

**Callouts (general).** Neutral: `--subtle` background, `--hairline` border. Info: slate tint. Success: sage tint. Warning: amber tint. Always icon plus text.

**Timeline.** A vertical list of phases using toggle rows. Each row: a status indicator (empty circle, half circle, check), the phase name, and a status tag. The current phase is in weight 600 and expanded by default. Expanded phases show their steps indented 20px.

**Toggle rows.** A 12px chevron that rotates 90° when expanded, aligned with the text. Children indent 20px. 120ms transition, no layout jump. Built as a real `<button>` with `aria-expanded`.

**Checklist items.** 16px checkbox with 3px radius and `--control-border`. Checked: filled `--primary-bg` with a white check, label turns `--ink-secondary` with a line-through. The whole row is the click target (minimum 44px tall on mobile).

**Review round (approval step).** A card on `--sheet` with a `--hairline` border.
- Header: phase label on the left (e.g. "Design"), round tag on the right ("Runde 1 av 2").
- My instructions ("Dette ser vi etter") in Body.
- Review links as small link chips with an external-link icon, each with a label ("Forside", "Tjenesteside").
- Snapshots as thumbnails that open in a dialog.
- Footer with a hairline top border: "Godkjenn" (primary) and "Be om endringer" (secondary), and the comment field.
- Earlier rounds below, collapsed, showing what was shown and what was answered.

**Lists and tables.** Rows separated by 1px `--hairline`, no zebra striping, no outer box. Row height 40px (48px on mobile). Hover: `--subtle`. Row actions appear on hover and on keyboard focus, and are always visible on touch devices.

**Tags.** 20px tall (24px on mobile), 4px radius, 4px 8px padding, Label style, status colours from the table. Sentence case, Norwegian text.

**Buttons.**
- Primary: `--primary-bg`, `--primary-text`, 4px radius, 36px tall (44px on mobile). At most one per view.
- Secondary: transparent, 1px `--control-border`, `--ink` text, `--subtle` on hover.
- Ghost: no border, `--ink-secondary` text turning `--ink` on hover. Default for row actions.
- Destructive: secondary or ghost with brick text, always with a confirmation dialog.

**Inputs.** `--sheet` background, 1px `--control-border`, 4px radius, 40px tall (44px on mobile), 16px text. The label is always visible above the field. Helper text below in Small. Errors in brick text with an icon, linked with `aria-describedby`, and the field border turns brick.

**Upload.** A drop zone with a dashed `--control-border`, one line of text ("Dra filer hit, eller velg filer") and a secondary button. Uploaded files appear as list rows with name, size and date.

**Comments.** Like document comments: initials avatar, name, time, text. No speech bubbles. The input sits at the bottom of the thread and grows as you type.

**Empty states.** One short line in `--ink-secondary` and, if relevant, one ghost button. No illustrations.

**Icons.** Lucide, 16px, 1.5 stroke, `--ink-secondary` turning `--ink` on interaction, with a click target of at least 24×24px (44×44px on mobile). Icons support text and never replace it, except universally understood actions that also have an accessible label.

**Handover page.** Same document style. Colour swatches as 40px squares with 4px radius, the hex value next to them, and a copy button. Font samples set in the actual font, with "Æ Ø Å æ ø å" included in the sample. Logo files as list rows with format and a download button.

**Leads (admin).** A dense table in Body compact. Score shown as a number in mono plus a status tag; the one-sentence reason in `--ink-secondary` under the business name.

## Interaction and motion

- Transitions 120ms ease-out, only for hover, toggling, opening and closing.
- Respect `prefers-reduced-motion`.
- Focus ring: 2px solid `--focus` with 2px offset on every focusable element. Never remove it.
- Links in body text: `--ink` with a 1px underline (3px offset). On hover the underline turns `--focus`.
- Clickable rows are real links or buttons, not divs with click handlers.

## Norwegian users

**Language and tone**
- `<html lang="nb">`. All client-facing text in Norwegian bokmål, in plain language (klarspråk).
- Address the client as "du", never "De". Friendly and direct, short sentences, no exclamation marks in normal messages.
- **Sentence case everywhere:** headings, buttons, menu items, tags and page titles ("Be om endringer", not "Be Om Endringer"). Norwegian does not use title case.
- No English words in the client interface. Use these terms consistently:

| Avoid | Use |
|---|---|
| Staging, preview | Forhåndsvisning |
| Upload | Last opp |
| Feedback | Tilbakemelding |
| Approve / Request changes | Godkjenn / Be om endringer |
| Change request | Endringsønske |
| Handover | Overlevering |
| Dashboard | Oversikt |
| Deadline | Frist |
| Submit / Save draft | Send inn / Lagre utkast |
| Log in / Log out | Logg inn / Logg ut |

**Formats** — always through `Intl` with locale `nb-NO` and time zone `Europe/Oslo`:
- Dates in text: "9. oktober 2026". In tables: "09.10.2026". Short: "9. okt.".
- Time: 24-hour clock, "kl. 14.30" in running text and "14:30" in tables.
- Relative time: "for 5 minutter siden", "i går kl. 14.30".
- Weeks start on Monday. Show week numbers ("uke 42") in date pickers and in the timeline, since Norwegian businesses plan by week.
- Numbers: decimal comma and a non-breaking space as thousands separator: "12 500", "2,5 timer".
- Money: "1 490 kr", with a non-breaking space before "kr". Amounts in øre in the database.
- Phone numbers: displayed as "412 34 567" (or "+47 412 34 567" when the country code matters), accepted with or without spaces and +47, and always clickable `tel:` links.
- Organisation numbers: displayed as "123 456 789", validated as 9 digits with the modulus 11 check.
- Addresses: street address on one line, then postnummer and poststed ("0150 Oslo"). Postnummer is validated as 4 digits.

**Text handling**
- Long Norwegian compound words ("Vedlikeholdsavtale", "Godkjenningsrunde", "Overleveringsside") must never overflow or be cut off. Use `hyphens: auto` (works with `lang="nb"`) and `overflow-wrap: break-word`, and test buttons, tags and table headers with long words.
- Æ, Ø and Å must render in every font and weight. Sort lists with `localeCompare(…, "nb")` so Æ, Ø and Å come after Z.
- URL slugs: "æ" becomes "ae", "ø" becomes "o", "å" becomes "a".

**Legal context**
- Universal design of ICT is a legal requirement in Norway, and WCAG 2.1 AA is the standard. Treat every accessibility rule in this file and in BRIEF.md as mandatory, not as polish.
- Portal uses only strictly necessary cookies (login). Do not add analytics, tracking or third-party embeds without asking me, since they would require consent.

## Accessibility checklist

Everything in BRIEF.md applies. For this design in particular:
- Hover-only controls also appear on keyboard focus and are always visible on touch devices.
- Status is never shown by colour alone.
- Touch targets are at least 44×44px on mobile.
- Every page has one `h1` and a logical heading order.
- Test each page with keyboard only and with NVDA or JAWS.

## How to apply this

1. Put all tokens in one place: CSS variables for light and dark mode (following `prefers-color-scheme`), mapped into the Tailwind theme.
2. Build the shared components first: Breadcrumbs, PageHeader, Properties, Callout, DinTur, Timeline, ToggleRow, ChecklistItem, ReviewRound, ListRow, Tag, Button, Input, Upload, CommentThread, Menu, Dialog, EmptyState.
3. Put the Norwegian formatting helpers (date, time, relative time, week number, money, number, phone, org number, postnummer) in one module with unit tests.
4. Update the pages one at a time to use the components.
5. If shadcn/ui is used, restyle its components to these tokens instead of keeping its defaults.
6. After each page, check it at 375px and 1280px, in light and dark mode, with keyboard only, and with a long Norwegian word in every label.
