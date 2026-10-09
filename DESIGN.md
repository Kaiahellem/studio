# Portal — Design Guide

This file defines the visual design and the Norwegian conventions of Portal. It replaces the "Design" section in BRIEF.md. If the two disagree, follow this file. Read it before building or changing any UI. All values here have been checked for contrast; do not replace them with values from other sources.

## Direction: Light and floating

A bright, calm workspace that feels like a well-made macOS or iOS app. White surfaces float softly above a near-white background. Nothing is boxed in by lines; depth comes from soft shadows and quiet tonal layers.

Principles:
- **White and cool neutral.** One cool neutral grey family from background to text. No warm off-whites, no mixing of warm and cool greys.
- **Float, don't frame.** Cards have no borders. They lift off the background with a soft, layered shadow.
- **Group with tone inside cards.** Content inside a card is grouped with light grey inset areas, never with nested shadows or lines.
- **Restrained colour.** Near-black ink and white carry the interface. Colour is used only for status tags and the focus ring.
- **Norwegian first.** Language, formats and conventions follow Norwegian practice everywhere (see "Norwegian users").

## Colour tokens

Define all colours as CSS variables (and in the Tailwind theme) and never use raw hex values in components.

### Surfaces, text and lines

| Token | Light | Dark | Use |
|---|---|---|---|
| `--canvas` | `#F7F7F8` | `#111113` | App background, including the sidebar |
| `--card` | `#FFFFFF` | `#1C1C1F` | Cards, menus, dialogs |
| `--inset` | `#F4F4F5` | `#26262A` | Grey areas inside cards, link chips, drop zones |
| `--hover` | `#EDEDEF` | `#2A2A2E` | Hover on rows and navigation items |
| `--selected` | `#E9E9EC` | `#303035` | Selected navigation item, pressed rows |
| `--ink` | `#18181B` | `#EDEDEF` | Headings, body text, active navigation |
| `--ink-secondary` | `#5E5E66` | `#A1A1A9` | Metadata, timestamps, helper text, placeholders |
| `--ink-disabled` | `#A1A1AA` | `#6E6E76` | Disabled text and purely decorative elements only |
| `--separator` | `#ECECEE` | `rgba(255,255,255,0.07)` | Inset separators between rows inside a card |
| `--control-border` | `#8A8A93` | `#7C7C85` | Borders on inputs, checkboxes, radio buttons, secondary buttons |
| `--focus` | `#2B66D6` | `#6E9BF0` | Focus ring, and link underline on hover |

Rules:
- **No borders on cards, sections or callouts.** The only lines in the interface are inset row separators inside cards, and the borders on form controls.
- Form controls always keep `--control-border`. It meets the 3:1 requirement for interface components on `--card` and `--inset`, so people can see where to type and click.
- In dark mode shadows are barely visible, so cards also get a 1px border of `rgba(255,255,255,0.06)`. This is the one exception to the no-border rule.

### Buttons

| Token | Light | Dark |
|---|---|---|
| `--primary-bg` | `#18181B` | `#EDEDEF` |
| `--primary-bg-hover` | `#3F3F46` | `#FFFFFF` |
| `--primary-text` | `#FFFFFF` | `#18181B` |

### Status

Status is always shown as text in a tag, never by colour alone.

| Status | Light text / background | Dark text / background | Use |
|---|---|---|---|
| Neutral | `#5E5E66` / `#F1F1F3` | `#C9C9C6` / `#2E2F33` | Pending, not started |
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
- Content column max width 840px (760px for pure text pages). Admin tables and the dashboard may use up to 1100px.
- Page margins: 48px desktop, 32px tablet, 16px mobile. Gap between cards: 16px (24px between groups of cards).
- Card padding: 20px desktop, 16px mobile.

**App shell**
- **Desktop (≥1024px):** a collapsible sidebar, 260px, on the same `--canvas` as the page, with no divider line. The page content sits directly on `--canvas`: breadcrumbs and title on the background, content grouped in floating cards. There is no outer sheet or frame around the page.
- **Tablet (768–1023px):** the sidebar becomes a slide-over drawer (a `--card` with the overlay shadow).
- **Mobile (≤767px):** content on `--canvas` with 16px margins. A slim sticky top bar with the page title and a menu button. When content scrolls under it, the top bar becomes translucent: `--canvas` at 80% opacity with `backdrop-filter: blur(20px)`, falling back to solid `--canvas` where blur is not supported. Navigation opens as a full-height sheet.
- **Navigation items:** 36px rows (44px on mobile), 8px radius, `--hover` on hover, `--selected` when active. Icons 16px in `--ink-secondary`, label in `--ink`.
- **Client side:** the sidebar shows only the client's own projects and sections: Oversikt, Dokumenter, Filer, Endringer, Overlevering. With one project, skip the project level.

## Elevation and shape

Three levels. Shadows are soft, layered and neutral, never coloured.

| Level | Use | Shadow (light mode) |
|---|---|---|
| Card | Every card | `0 1px 2px rgba(16,16,20,0.04), 0 2px 8px rgba(16,16,20,0.04), 0 8px 24px rgba(16,16,20,0.04)` |
| Raised | "Din tur", hovered clickable cards | `0 1px 2px rgba(16,16,20,0.05), 0 4px 12px rgba(16,16,20,0.06), 0 12px 32px rgba(16,16,20,0.06)` |
| Overlay | Menus, popovers, dialogs, drawers | `0 2px 6px rgba(16,16,20,0.06), 0 16px 48px rgba(16,16,20,0.14)` |

- Hover on a clickable card: change from Card to Raised over 120ms. No movement, no scaling.
- Selected card (admin, e.g. the phase being edited): a 1.5px `--ink` ring outside the card. This is a selection indicator, not a border.
- Dialogs sit on a dimmed backdrop: `rgba(16,16,20,0.24)`.

Radius:

| Element | Radius |
|---|---|
| Cards | 12px |
| Inset areas inside cards | 10px |
| Buttons, inputs, selects | 10px |
| Navigation items, link chips | 8px |
| Tags | 6px |
| Checkboxes | 4px |
| Dialogs and drawers | 16px |

## Components

**Breadcrumbs.** On the canvas above the page title. Small text, separated by `/` in `--ink-disabled`. Parent links in `--ink-secondary`, current page in `--ink`. On mobile, replace with a back link.

**Page header.** Title XL directly on the canvas, no card. Below it, the properties card.

**Properties card.** A card styled as an iOS settings list: one row per property, label on the left in `--ink-secondary`, value on the right in `--ink`. Rows 48px tall, separated by `--separator` lines inset 20px from the left edge, no line after the last row. For a project: Status, Fase, Neste steg, Ønsket lansering, Forhåndsvisning. On narrow screens, the value moves under the label.

**"Din tur" card.** The most important element in Portal. A card at Raised level. Inside: a "Din tur" tag (slate), a Title M heading, one or two sentences, other waiting tasks as small links in `--ink-secondary`, and one primary button. When nothing is waiting on the client, the same card sits at Card level with a neutral tag ("Vi jobber med det"), says what I am working on and when they will hear from me, and has no button. Only one such card per page, always first after the header.

**Callouts (general).** An `--inset` area inside a card, with a 16px icon and text. For information that needs colour (success, warning, error), use the status tint as the background instead of `--inset`. Never a border.

**Lists (inset grouped).** Rows grouped in a card, like iOS settings: 48px rows, 20px side padding, `--separator` lines inset to align with the text (not under icons), no line after the last row. Hover: `--hover` on the row, with the card's radius kept on the first and last row. Row actions appear on hover and keyboard focus, and are always visible on touch devices. Tables on the admin side follow the same style, with a header row in Label style.

**Timeline.** An inset grouped list in one card. Each phase is a toggle row: a status indicator (empty circle, half circle, check), the phase name, and a status tag on the right. The current phase is in weight 600 and expanded by default. When expanded, its steps appear in an `--inset` area under the row, indented to align with the phase name.

**Toggle rows.** A 12px chevron that rotates 90° when expanded. 120ms transition, no layout jump. Built as a real `<button>` with `aria-expanded`.

**Checklist items.** 18px checkbox with 4px radius and `--control-border`. Checked: filled `--primary-bg` with a white check, label turns `--ink-secondary` with a line-through. The whole row is the click target (minimum 44px tall on mobile).

**Review round (approval step).** A card.
- Header row: phase label on the left (e.g. "Design"), round tag on the right ("Runde 1 av 2").
- My instructions ("Dette ser vi etter") in an `--inset` area.
- Review links as link chips: `--inset` background, 8px radius, an external-link icon and a label ("Forside", "Tjenesteside").
- Snapshots as thumbnails with 8px radius that open in a dialog.
- At the bottom, separated by space (not a line): the comment field, then "Godkjenn" (primary) and "Be om endringer" (secondary).
- Earlier rounds below as collapsed toggle rows, showing what was shown and what was answered.

**Tags.** 22px tall (26px on mobile), 6px radius, 2px 8px padding, Label style, status colours from the table. Sentence case, Norwegian text.

**Buttons.**
- Primary: `--primary-bg`, `--primary-text`, 10px radius, 40px tall (44px on mobile), 16px horizontal padding, no shadow. At most one per view.
- Secondary: `--card` background, 1px `--control-border`, `--ink` text, `--hover` on hover.
- Ghost: no background or border, `--ink-secondary` text turning `--ink` on hover with a `--hover` background. Default for row actions and "Legg til" actions.
- Destructive: secondary or ghost with brick text, always with a confirmation dialog.

**Inputs.** `--card` background, 1px `--control-border`, 10px radius, 44px tall, 16px text. On focus, the border turns `--focus` and the focus ring appears. The label is always visible above the field. Helper text below in Small. Errors in brick text with an icon, linked with `aria-describedby`, and the field border turns brick.

**Upload.** An `--inset` drop zone with a 1.5px dashed `--control-border`, 10px radius, one line of text ("Dra filer hit, eller velg filer") and a secondary button. Uploaded files appear below as an inset grouped list with name, size and date.

**"Legg til" actions (admin).** Adding a phase, step or task uses a full-width ghost row with a plus icon and a dashed `--control-border`, 10px radius, inside or below the card it adds to.

**Comments.** Like document comments: initials avatar, name, time, text, inside the card they belong to. No speech bubbles. The input sits at the bottom of the thread and grows as you type.

**Empty states.** Inside a card: one short line in `--ink-secondary` and, if relevant, one ghost button. No illustrations.

**Icons.** Lucide, 16px, 1.5 stroke, `--ink-secondary` turning `--ink` on interaction, with a click target of at least 24×24px (44×44px on mobile). Icons support text and never replace it, except universally understood actions that also have an accessible label.

**Handover page.** Same card style. Colour swatches as 48px squares with 10px radius and a subtle Card shadow, the hex value next to them, and a copy button. Font samples set in the actual font, with "Æ Ø Å æ ø å" included in the sample. Logo files as an inset grouped list with format and a download button.

**Leads (admin).** An inset grouped table in Body compact. Score shown as a number in mono plus a status tag; the one-sentence reason in `--ink-secondary` under the business name.

## Interaction and motion

- Transitions 120ms ease-out, only for hover, toggling, opening and closing.
- Respect `prefers-reduced-motion`.
- Focus ring: 2px solid `--focus` with 2px offset on every focusable element. Never remove it.
- Links in body text: `--ink` with a 1px underline (3px offset) in `--ink-disabled`. On hover the underline turns `--focus`.
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
2. Build the shared components first: Card (with Card, Raised and Overlay levels), Inset, Breadcrumbs, PageHeader, PropertiesCard, DinTurCard, InsetGroupedList, Timeline, ToggleRow, ChecklistItem, ReviewRound, LinkChip, Tag, Button, Input, Upload, AddRow, CommentThread, Menu, Dialog, EmptyState.
3. Put the Norwegian formatting helpers (date, time, relative time, week number, money, number, phone, org number, postnummer) in one module with unit tests.
4. Update the pages one at a time to use the components.
5. If shadcn/ui is used, restyle its components to these tokens instead of keeping its defaults.
6. After each page, check it at 375px and 1280px, in light and dark mode, with keyboard only, and with a long Norwegian word in every label. Check specifically that no card, section or callout has a border (except cards in dark mode), and that no warm grey has crept in.
