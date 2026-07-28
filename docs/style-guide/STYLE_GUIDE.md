# AskaPeer — Style Guide & Design System

**Version 0.2 · Status: Draft for review**

The single source of truth for how AskaPeer looks, feels and reads. This guide
codifies the aesthetic already validated in the mobile look-and-feel prototype
and makes it enforceable across the production web app (and, later, native iOS
and Android).

> **How to use this document.** Sections 1–3 are the *foundations* — read them
> first; every other decision descends from them. Sections 4–7 are the
> *systems* (spacing, elevation, iconography, motion). Section 8 is the
> *component catalogue*. Sections 9–11 are the *disciplines* that make AskaPeer
> different from a generic app: accessibility, voice, and the anonymity/safety
> UX that is the product's whole reason for existing. Section 12 is the
> machine-readable *token reference* the code consumes.
>
> A live, rendered companion to this document lives at
> [`styleguide.html`](./styleguide.html) — open it in a browser to see the
> palette, type scale and components in both light and dark themes.

---

## Contents

0. [First principles](#0-first-principles)
1. [Brand foundations](#1-brand-foundations)
2. [Colour](#2-colour)
3. [Typography](#3-typography)
4. [Spacing & layout](#4-spacing--layout)
5. [Elevation, radius & borders](#5-elevation-radius--borders)
6. [Iconography & imagery](#6-iconography--imagery)
7. [Motion](#7-motion)
8. [Component library](#8-component-library)
9. [Accessibility](#9-accessibility)
10. [Voice & tone](#10-voice--tone)
11. [Anonymity & safety UX](#11-anonymity--safety-ux)
12. [Design tokens reference](#12-design-tokens-reference)
13. [Governance & changelog](#13-governance--changelog)

---

## 0. First principles

AskaPeer is *"the no-ego sports medicine network"* — a verified-only,
pseudonymous professional network where **ideas win on merit, not rank**. That
single sentence is a design constraint, not just marketing. It produces three
rules that override any other guidance in this document when they conflict:

1. **Never introduce a hierarchy signal.** No photos, no job titles, no grades,
   no employers, no specialties, no "verified expert" tiers, no follower counts.
   The *only* status signal in the entire product is **kudos**. If a proposed
   design implies who is senior, it is wrong — regardless of how good it looks.

2. **Show anonymity, don't just claim it.** The interface should make a member
   *feel* unidentifiable: monogram tiles instead of avatars, handles instead of
   names, quiet confirmation ("You are anonymous to your peers") rather than
   legal boilerplate.

3. **Patient safety is a component, not a policy page.** De-identification and
   attestation are enforced *in the UI* — a case cannot be posted until the
   checklist and attestation are complete. Safety is designed, not documented.

Everything below serves these three rules.

### The character we are aiming for

Calm, precise, trustworthy, and quietly confident — the aesthetic of a
well-made professional instrument, not a consumer social app. Our reference
points, in four registers:

- **Editorial authority** — the sober, institutional confidence of the WHO
  (who.int): generous headings, hairline structure, considered whitespace.
- **Premium restraint** — the timeless serif-led typography of a brand like
  Rolex, which reads expensive precisely because it is quiet.
- **Systematic rigour** — the token discipline of tools like Stripe and Linear.
- **Interaction correctness & clinical clarity** — Apple's Human Interface
  Guidelines and the soberness of good clinical software.

**Trust is the product**, and the interface's job is to look like it can be
trusted with a difficult case at 11pm.

---

## 1. Brand foundations

### 1.1 Mission & philosophy

| | |
|---|---|
| **Product** | AskaPeer |
| **Tagline** | The No Ego Sports Medicine Network |
| **One-line** | A verified-only, pseudonymous professional network for sports-medicine practitioners. |
| **Vision** | *The quality of your thinking, not the prestige of your job title, determines your standing.* |
| **Primary audience** | UK registered practitioners; HCPC-registered physiotherapists are the primary segment. |

### 1.2 The name & wordmark

The product is written **AskaPeer** — one word, camel-case, with the medial
**a** carrying the brand. In the wordmark the **a** is set in the spark red
(`--color-spark`) against the navy of the rest of the word; this is the one
sanctioned place the two brand colours touch.

- Correct: `Ask` + red `a` + `Peer` → *AskaPeer*
- The full-lockup logo pairs the mark with the wordmark; a standalone mark is
  used in the compact app bar.
- **Never** write it "Ask a Peer", "ASKAPEER", "Askapeer" (except in prose where
  sentence case is unavoidable, e.g. legal copy — the codebase uses "Askapeer"
  in body text, which is acceptable; the *wordmark* is always **AskaPeer**).
- Do not recolour, outline, add a drop shadow to, rotate, or stretch the
  wordmark. Do not substitute the medial-a colour for anything but spark red.

### 1.3 What we never show

This is the shortest and most important brand asset we have. On any surface that
represents a member, the following are **prohibited**:

- ❌ Photographs of people (members, patients, or stock)
- ❌ Real names
- ❌ Job title, grade, or seniority ("Consultant", "Band 7", "Senior")
- ❌ Employer, club, team, hospital, or clinic
- ❌ Specialty or profession label
- ❌ Location beyond nothing (no city, no region)
- ❌ Any ranked badge other than kudos-derived standing

The only things a member ever sees about another member are: their **handle**,
their **monogram tile**, their **kudos**, their **join year**, and — where
earned — a **kudos-derived contributor band** (e.g. "top 8%") and per-post
signals (**Best answer**, **Answered**).

### 1.4 Design principles (applied)

| Principle | In practice |
|---|---|
| **Merit over rank** | Kudos is the only status colour and the only ranked signal. Sort by kudos, never by seniority. |
| **Anonymity, shown** | Monogram tiles, never photos. Handles, never names. Reassurance copy at the point of doubt. |
| **Safety by design** | De-identification checklist + attestation gate the Post button. Green "de-identified & attested" confirmation on the record. |
| **Mobile-first** | Thumb-reachable primary action, bottom tab bar, one-hand ergonomics, safe-area aware. |
| **Calm & clinical** | Quiet neutrals, disciplined accent use, generous whitespace, no gamified noise. |
| **Plain & humane** | Short sentences, British English, no jargon, one rule stated once and firmly. |

---

## 2. Colour

Colour in AskaPeer is deliberately restrained. A large neutral canvas carries
the content; accents are rationed so that the **one accent that signals status —
kudos gold — is never drowned out**.

### 2.1 Brand palette

| Role | Token | Light | Notes |
|---|---|---|---|
| **Primary / brand** | `--color-navy` | `#001f52` | The brand colour. Primary buttons, active nav, links, focus rings, chips. |
| Primary (dark) | `--color-navy-dark` | `#001640` | Hover/pressed for primary; wordmark. |
| Primary tint | `--color-navy-tint` | `#e6ebf2` | Selected/hover backgrounds, badges. |
| Primary tint 2 | `--color-navy-tint-2` | `#f2f5f9` | Subtle informational panels. |
| **Spark / accent** | `--color-spark` | `#ed1b24` | **Reserved.** The Ask action and the wordmark **a** only. |
| Spark (dark) | `--color-spark-dark` | `#c00f18` | The lower stop of the Ask FAB gradient; text-on-white spark. |
| Spark tint | `--color-spark-tint` | `#fdecec` | Rare — spark-adjacent backgrounds. |
| **Kudos / status** | `--color-kudos` | `#d98a1f` | **The only status colour.** Kudos counts, the star, contributor bands. |
| Kudos (text) | `--color-kudos-text` | `#8a5a12` | AA-safe kudos text on light (see §9). |
| Kudos tint | `--color-kudos-tint` | `#fbf0dc` | Kudos pills, hero chip, attestation panel. |
| **Verify / trust** | `--color-verify` | `#2e8b6f` | Best answer, "Answered", verified member, de-identified confirmation. |
| Verify (text) | `--color-verify-text` | `#256f59` | AA-safe verify text on light. |
| Verify tint | `--color-verify-tint` | `#e4f2eb` | Best-answer card wash, verified panels. |
| **Danger / destructive** | `--color-danger` | `#c0492f` | Destructive actions (sign out, delete) and the unread nav dot only. |
| **Warn / attention** | `--color-warn` | `#9a5f0a` | **Functional, admin-only.** "Needs a human" states in the moderation console (pending review, needs-more-info). Never member-facing. |

> **Why two reds?** Spark red (`#ed1b24`, bright) is a *brand* colour reserved
> for the single primary affordance (Ask) and the wordmark. Danger
> (`#c0492f`, a muted terracotta) is a *functional* destructive colour. They are
> intentionally different hues so "brand" and "danger" never read as the same
> thing. Do not use spark red for delete/error, and do not use danger for the
> Ask button.

> **Warn is not kudos gold.** `--color-warn` is a muted amber-brown used *only*
> by the admin/moderation console to flag review states that need a human — the
> same functional-vs-brand split as danger-vs-spark. It is deliberately darker
> and browner than kudos gold (`#d98a1f`) and, critically, **never appears in
> the member-facing product**, so kudos remains the single status colour members
> ever see (§2.1). The light value is darkened to `#9a5f0a` to stay AA as text on
> the console's 15%-tint badges. Never use `--color-warn` for kudos, and never
> use kudos gold for a warning.

### 2.2 Neutrals

| Role | Token | Light | Dark |
|---|---|---|---|
| App background | `--color-bg` | `#eef1f4` | `#0b1220` |
| Surface (cards, sheets, bars) | `--color-surface` | `#ffffff` | `#111a2b` |
| Text (primary) | `--color-fg` | `#14212b` | `#e2e8f0` |
| Text (muted) | `--color-muted` | `#64757f` | `#94a3b8` |
| Text (faint) | `--color-faint` | `#93a1a9` | `#5f7183` |
| Border | `--color-border` | `#e5ebee` | `#1e2c40` |
| Border (strong) | `--color-border-strong` | `#d7e0e4` | `#2a3a52` |

### 2.3 Dark theme accents

Navy is the brand identity colour but is unusable as an *interactive* colour on
a dark background. In dark theme, interactive elements use a lightened brand
blue while navy remains the identity colour in wordmarks and large fills.

| Role | Token | Dark value |
|---|---|---|
| Interactive / accent (dark) | `--color-accent` (dark) | `#6f9bff` |
| Kudos (dark) | `--color-kudos` (dark) | `#e2a53f` |
| Verify (dark) | `--color-verify` (dark) | `#4bbf98` |
| Spark (dark) | `--color-spark` (dark) | `#ff5a5f` |
| Warn (dark) | `--color-warn` (dark) | `#e0a33a` |

### 2.4 Semantic mapping (what the code references)

Components must reference **semantic** tokens, never raw palette values. This is
what makes applying the design system a *theming pass* rather than a rewrite —
exactly as noted in `apps/web/src/app/globals.css`.

> **Where the values live.** This guide is the canonical spec for the *reasoning*;
> the *values* live in `packages/design-tokens`, which generates the CSS token
> layer in `apps/web/src/app/globals.css` (`npm run tokens:build`; CI fails if the
> two diverge). Edit the package, never the generated region. The values are kept
> platform-neutral so a non-CSS client can consume the same tokens rather than a
> hand-copied duplicate of them — see that package's README for the rationale.

| Semantic token | Maps to (light) | Meaning |
|---|---|---|
| `--color-accent` | `--color-navy` | The primary interactive colour. |
| `--color-ok` | `--color-verify` | Success / trust / affirmative. |
| `--color-bad` | `--color-danger` | Destructive / error. |
| `--color-bg` / `--color-surface` / `--color-fg` / `--color-muted` | as above | Canvas & text. |

> **Migration note.** The production app currently ships placeholder tokens
> (a generic sky `#0ea5e9` accent) and the system font stack. Adopting this
> guide means: (1) set `--color-accent: #001f52` and add `--color-kudos`,
> `--color-verify`, `--color-spark`, `--color-danger` and the neutral scale in
> `globals.css`; (2) load **Fraunces** + **Inter** via `next/font` and set
> `--font-display` / `--font-sans`; (3) apply `--font-display` to heading
> elements. No component *markup* needs to change. See §12 for a drop-in block.

### 2.5 Colour usage rules

- **60 / 30 / 10, roughly.** ~60% neutral canvas, ~30% surfaces and text, ~10%
  accent. If a screen is more than 10% saturated colour, something is wrong.
- **Kudos gold is sacred.** Never use gold for anything that isn't kudos or
  kudos-derived standing. It is the product's one status signal.
- **Spark red is rationed.** One spark element per screen at most — the Ask FAB.
  The wordmark's medial **a** is the only other place it appears.
- **Never encode meaning in colour alone** (see §9.2). Best answer has a label
  *and* a tint; the unread dot has position *and* colour.

---

## 3. Typography

### 3.1 Typefaces

AskaPeer pairs a **serif for headings** with a **sans for everything else** — a
deliberately editorial pairing that gives the product two registers at once:
the *authority* of an institution (think WHO) and the *timeless, premium*
restraint of a considered brand (think Rolex), without ever adding a hierarchy
signal.

| Role | Typeface | Where |
|---|---|---|
| **Display / headings** | **Fraunces** | Screen titles, thread question (H1), card & section headings, large stat numbers |
| **Text / UI / data** | **Inter** | Body copy, labels, buttons, chips, meta, stats, form fields — everything that isn't a heading |

```css
--font-display: 'Fraunces', Georgia, 'Times New Roman', serif;   /* headings only */
--font-sans:    'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI",
                Roboto, Helvetica, Arial, sans-serif;             /* everything else */
```

**Fraunces** is an "old-style" serif with optical warmth — it carries gravitas
at heading sizes and a subtle character (especially in *italic*, used sparingly
for emphasis) that reads premium, not decorative. **Inter** is a neutral,
highly-legible UI sans that keeps the interface crisp and clinical.

- **Hosting:** self-host both via `next/font` (Next.js) — do **not** hot-link
  Google Fonts in production (privacy + performance). Ship only the weights in
  §3.3 and the `latin` subset for en-GB.
- **Fallbacks matter:** the stacks above degrade gracefully (Georgia for the
  serif, system sans for Inter) so a slow font load never breaks layout.
- **Serif is for headings only.** Never set body, labels, buttons, or data in
  the serif; never set a screen title in the sans. This split *is* the system.

### 3.2 Type scale

Sizes are tuned for mobile reading. Headings are **Fraunces** (serif); the
eyebrow, label, body, caption tiers are **Inter** (sans). `letter-spacing`
tightens as serif size grows; the uppercase eyebrow/label tiers are tracked open.

| Token | Family | Size / line-height | Weight | Tracking | Use |
|---|---|---|---|---|---|
| `--text-display` | Fraunces | 26px / 1.12 | 600 | −0.01em | Screen titles ("Discussions") |
| `--text-title` | Fraunces | 22px / 1.24 | 600 | −0.005em | Thread question (H1) |
| `--text-heading` | Fraunces | 17px / 1.3 | 600 | 0 | Card titles, sheet titles |
| `--text-stat` | Fraunces | 20–24px / 1.1 | 600 | 0 | Large stat numbers, kudos totals |
| `--text-eyebrow` | Inter | 11.5px / 1.2 | 700 | +0.16em, uppercase | Eyebrow labels above titles |
| `--text-body` | Inter | 14.5px / 1.5 | 400 | 0 | Answer bodies, primary reading text |
| `--text-body-sm` | Inter | 13.5px / 1.5 | 400 | 0 | Snippets, secondary reading |
| `--text-label` | Inter | 12px / 1.3 | 700 | +0.06em, uppercase | Field labels, section labels |
| `--text-caption` | Inter | 12px / 1.3 | 600 | 0 | Meta, stats, handles |

### 3.3 Weight scale

Ship only these weights (keeps the font payload small).

| Family | Weights | Use |
|---|---|---|
| **Fraunces** | 600 Semibold, 700 Bold | Headings; 600 is the default heading weight, 700 for the largest display / hero |
| **Inter** | 400 Regular, 500 Medium, 600 Semibold, 700 Bold, 800 Extrabold | 400 body · 500 handles/emphasis · 600 meta/chips/buttons · 700 labels & eyebrows · 800 rare emphasis |

Fraunces *italic* (600) is permitted **sparingly** for a single emphasised word
in a hero or headline (e.g. *"Ideas win on **merit**, not rank."*). Never
italicise body copy.

### 3.4 Editorial polish (the WHO/Rolex register)

A small set of moves lift the layout from "app" to "considered institution".
Use them consistently:

- **Eyebrow + title + keyline.** A section or screen leads with an *eyebrow*
  (uppercase, tracked, Inter) above a *serif title*, followed by a short **accent
  keyline** (a ~44px, 2px bar). Use the keyline **once per screen/section**, not
  on every card — restraint is the point.
- **Confident scale.** Give headings room; pair them with generous whitespace
  rather than dense stacking.
- **Hairline rhythm.** Separate major sections with a single hairline
  (`--color-border`) rather than boxes where possible.

### 3.5 Typographic rules

- **British English throughout** (en-GB): "specialise", "colour", "-ise"
  endings. The codebase locale is `en-GB` — do not introduce American spellings.
- **Sentence case** for everything except the wordmark and eyebrow/micro-labels
  (which are `UPPERCASE` with tracking). No Title Case headings.
- **One H1 per screen** — the thread question. Cards use `h3`; never skip
  heading levels (accessibility, §9).
- **Numerals are content.** Kudos counts and large stats are set in Fraunces so
  they read as considered figures; align and never truncate them.
- Body copy target measure: **60–75 characters**. On the 430px mobile frame the
  16px side padding delivers this naturally; preserve it on wider viewports by
  constraining content to `--container-max` (see §4).

---

## 4. Spacing & layout

### 4.1 Spacing scale

A **4px base unit**. Use scale steps; do not invent one-off values.

| Token | px | Typical use |
|---|---|---|
| `--space-1` | 4 | Icon-to-label, tight inline gaps |
| `--space-2` | 8 | Chip gaps, stat gaps |
| `--space-3` | 12 | Intra-card gaps, list gaps |
| `--space-4` | 16 | **Standard screen side padding & card padding** |
| `--space-5` | 20 | Section separation |
| `--space-6` | 24 | Pane bottom padding, large separation |
| `--space-8` | 32 | Major section breaks |

**16px (`--space-4`) is the workhorse** — the horizontal margin of virtually
every screen and the padding of every card.

### 4.2 The mobile frame & breakpoints

AskaPeer is **mobile-first**. The canonical layout is a single column with a
maximum content width; the "phone frame" is a desktop affordance, not the
product.

| Token | Value | Meaning |
|---|---|---|
| `--container-max` | 430px | Max width of the app column; centred on wider screens. |
| `--breakpoint-frame` | 500px | At/above this, show the device-frame chrome (desktop preview only). |
| `--breakpoint-lg` | 1024px | Admin console and future desktop-optimised surfaces. |

- The member-facing app stays a centred **≤430px column** at all widths. Do not
  build multi-column member layouts — they reintroduce desktop-first thinking
  and break the one-hand model.
- The **admin console** is a separate context and may use wider, denser desktop
  layouts.

### 4.3 App shell anatomy

```
┌─────────────────────────────┐  ← safe-area-inset-top
│  App bar        (52px)       │  surface, 1px bottom border
├─────────────────────────────┤
│                             ▲│
│  Content (pager / overlay)  ││  scrolls; horizontal snap between panes
│                             ▼│
├─────────────────────────────┤
│  Bottom nav     (62px)       │  surface, 1px top border, FAB centred
└─────────────────────────────┘  ← safe-area-inset-bottom
```

- Fixed heights: `--appbar-h: 52px`, `--nav-h: 62px`.
- **Always** honour `env(safe-area-inset-*)` on the app bar (top) and bottom nav
  (bottom). Content must never sit under the notch or home indicator.
- The five destinations are fixed in order: **Feed · Discussions · Ask (centre) ·
  Activity · Profile.** Ask is centred because it is the primary action.

### 4.4 Layout rules

- One column, generous vertical rhythm, cards separated by `--space-3` (10–12px).
- Group related controls; separate unrelated ones with whitespace, not rules,
  wherever possible. Use 1px borders only to delineate true containers.
- Thumb zone: primary and destructive actions belong in the lower third; avoid
  putting frequent actions in the top corners.

---

## 5. Elevation, radius & borders

### 5.1 Radius

| Token | Value | Use |
|---|---|---|
| `--radius-pill` | 999px | Chips, kudos buttons, primary/secondary buttons, input in reply dock |
| `--radius-lg` | 20px | Sheet top corners, large monogram tiles |
| `--radius` | 16px | **Default** — cards, panels, inputs, stat blocks |
| `--radius-md` | 14px | Answers, checklist, secondary panels |
| `--radius-sm` | 12px | Inputs in the compose sheet, small containers |
| `--radius-avatar` | 8–9px | **Monogram tiles are rounded squares, not circles** |
| `--radius-avatar-lg` | 20px | Large profile monogram tile |

> **Monogram tiles are squircles, never circles.** A circular avatar reads as
> "person / photo slot". A rounded square reads as "identity token" — which is
> exactly the anonymity signal we want. This is a deliberate, load-bearing
> decision; do not "fix" it to circles.

### 5.2 Elevation

Elevation is subtle. Cards float a millimetre above the canvas; sheets and the
FAB are the only strongly-raised elements.

| Token | Value | Use |
|---|---|---|
| `--shadow-card` | `0 1px 2px rgba(20,33,43,.06), 0 4px 16px rgba(20,33,43,.05)` | Cards, stat blocks, settings |
| `--shadow-fab` | `0 6px 16px rgba(237,27,36,.4)` | The Ask FAB (spark-tinted) |
| `--shadow-sheet` | `0 -8px 40px rgba(15,25,32,.18)` | Compose sheet rising over the scrim |
| `--shadow-none` | `none` | Flat elements inside a card |

- Prefer a **1px border + faint card shadow** over heavy drop shadows.
- In dark theme, reduce shadow opacity and lean on borders for separation.

### 5.3 Borders

- Default hairline: `1px solid var(--color-border)`.
- Container edges that need more definition: `--color-border-strong`.
- Focus/selected: `1px` (or `2px` focus ring) in `--color-accent` — see §9.3.

---

## 6. Iconography & imagery

### 6.1 Icon style

- **Line icons**, 24×24 viewBox, `stroke-width: 2` (2.2–2.4 for small
  checkmarks/chevrons), `stroke-linecap/linejoin: round`. `currentColor` fill so
  icons inherit text colour.
- Rendered sizes: 15px (inline stat), 18–22px (buttons/nav), 25px (tab icons),
  26px (FAB).
- **The kudos star is the one exception**: a *filled* star, always in
  `--color-kudos`. It is the product's signature glyph — keep it filled and gold
  everywhere, never outlined, never recoloured.
- One icon family, one weight. Do not mix filled and line styles within a
  control (except the kudos star, by definition).

> **Note:** the production app currently uses emoji glyphs (📰 💬 ➕ 🔔 👤 👏) as
> placeholders. These must be replaced with the line-icon set + filled kudos
> star before launch; emoji are inconsistent across platforms and undermine the
> calm, clinical character.

### 6.2 Imagery

- **No photography of people. Ever.** (See §1.3 — this is a brand rule, not a
  stylistic one.)
- Identity is represented by **monogram tiles**: a rounded-square tile, a solid
  desaturated colour drawn from a fixed palette, white initials in weight 700.
  The tile colour is derived deterministically from the handle so a member's
  tile is stable, but the colour carries *no meaning* (it is not a status or
  category signal).
- Illustration, if ever introduced, must be abstract/diagrammatic (e.g. body-area
  maps), never depict identifiable people.
- Clinical images attached to case discussions are governed by the
  de-identification checklist (§11) — no faces, tattoos, scars, or identifying
  features.

### 6.3 Monogram tile spec

| Property | Value |
|---|---|
| Shape | Rounded square, `--radius-avatar` |
| Sizes | 26px (sm), 30px (default), 72px (profile, `--radius-avatar-lg`) |
| Initials | 1–2 letters from the handle, weight 700, white |
| Background | Solid, desaturated tone from the fixed monogram palette |
| Meaning | None — decorative identity token only |

---

## 7. Motion

Motion is **functional and quick** — it clarifies spatial relationships and
confirms actions. Nothing is decorative; nothing bounces for personality.

### 7.1 Duration & easing

| Token | Value | Use |
|---|---|---|
| `--motion-fast` | 120ms | Chip/button state, kudos toggle, hover |
| `--motion-base` | 240ms | Thread slide-in, view transitions |
| `--motion-sheet` | 280ms | Compose sheet rise/fall |
| `--motion-toast` | 250ms | Toast in/out |
| `--ease-standard` | `cubic-bezier(.32,.72,0,1)` | Sheets & large surfaces (decelerate) |
| `--ease-in-out` | `ease` | General transitions |

### 7.2 Signature transitions

- **Pane paging** — horizontal scroll-snap between Feed / Discussions / Activity
  / Profile; the matching nav icon lights on settle.
- **Thread overlay** — slides in from the right (`translateX(100%)→0`), giving a
  clear "deeper" spatial model; back gesture reverses it.
- **Compose sheet** — rises from the bottom over a 40%-black scrim with the
  decelerate easing; a grabber handle signals draggability.
- **Kudos toggle** — instant fill + count change at `--motion-fast`; the control
  is the feedback, no separate animation needed.
- **Toast** — fades up 20px and back; auto-dismiss ~2.2s.
- **Press feedback** — cards scale to `.992` on `:active`; icon buttons flash a
  tint background.

### 7.3 Reduced motion

Respect `prefers-reduced-motion: reduce`. Replace slides/rises with a
**fast opacity fade** (≤120ms), disable the card press-scale, and never animate
anything essential to comprehension. No parallax, no autoplay, ever.

---

## 8. Component library

Every component references semantic tokens (§12) and obeys the accessibility
rules in §9. Anatomy, states, and do/don'ts follow. The live renderings are in
[`styleguide.html`](./styleguide.html).

### 8.1 Buttons

| Variant | Look | Use |
|---|---|---|
| **Primary** | Navy fill, white text, `--radius-pill`, 700 | The main action of a view (Post, Confirm, Send) |
| **Secondary** | Surface fill, `--color-border-strong` outline, muted text, 700 | Alternate actions |
| **Ghost / icon** | Transparent, muted `currentColor`, circular tap target | App-bar and toolbar actions |
| **Destructive** | `--color-danger` text or fill | Sign out, delete |
| **Ask (FAB)** | Spark→spark-dark gradient, white plus, `--radius-lg`, `--shadow-fab` | The single primary action; centre of bottom nav |

- **States:** default, hover (darken ~8%), pressed (`--color-navy-dark`),
  disabled (`#c3ccd1` fill / reduced opacity, `cursor: not-allowed`), focus
  (visible ring, §9.3).
- **Min target 44×44px** even when the visual is smaller.
- Only **one primary button per view**. The FAB is the app-wide primary; a sheet
  or form may have its own local primary (e.g. sheet **Post**).

### 8.2 Chips (filters & tags)

- **Filter chip** — pill, `--color-border-strong` outline on surface, 600 muted;
  **active** = navy fill, white text. Horizontally scrollable row, no wrap.
- **Category tag** — small rounded rect (`6px`), `--color-navy-tint` bg,
  `--color-navy-dark` text, 700 — the body-area label (Knee, Shoulder…).
- **Topic tag** — neutral grey variant for secondary labels (Research, Return to
  play).
- **Muted pill** — transparent, faint text, for meta states ("Case discussion",
  "Unanswered").

Do: use one active filter chip at a time in a single-select row.
Don't: colour category tags with kudos gold or spark red.

### 8.3 Cards

The primary content container. `--color-surface`, `1px --color-border`,
`--radius` (16px), `--space-4` padding, `--shadow-card`. `:active` scales to
`.992`.

- **Article card (Feed)** — tag row · title (`--text-heading`) · snippet ·
  meta row (source · read-time · kudos star+count).
- **Discussion card** — tag row · title · 2-line clamped snippet · footer with
  author (monogram + handle) on the left and stats (answers, kudos, or
  "Answered"/time) on the right.
- **Answer card** — inside a thread; author row, body, kudos button. The
  **top/best answer** gets a `--color-verify-tint` wash, a verify-tinted inset
  ring, and a **Best answer** badge.

### 8.4 Author line

Handle + kudos **only**. No grade, employer, or specialty — "a reader can weigh
the contribution but not the contributor's seniority" (from the code's own
comment). A kudos-derived **top-contributor** chip may appear; nothing else.

### 8.5 Monogram tile

See §6.3. Rounded square, deterministic desaturated colour, white 700 initials.
Sizes sm/default/lg.

### 8.6 Kudos control

The product's signature interactive element.

- **Anatomy:** pill button, filled gold star + count.
- **States:** default (surface, `--color-border-strong` outline, muted) → given
  (`--color-kudos-tint` bg, gold border, `--color-kudos` text). Toggling updates
  the count instantly.
- Read-only kudos (in meta rows) = filled gold star + count, no button chrome.
- **Accessibility:** label as "Give kudos" / "Remove kudos"; the count must be
  announced. Never rely on colour alone — the star shape carries it too (§9.2).

### 8.7 Status & safety badges

| Badge | Look | Meaning |
|---|---|---|
| **Best answer** | Verify-tint pill, verify text, tick icon, uppercase | Highest-kudos answer the asker/peers endorse |
| **Answered** | Verify text + tick, inline | Thread has an accepted/qualifying answer |
| **Verified member** | "Verified member · since {year}", verify accent | Passed identity verification |
| **De-identified & attested** | Verify-tint panel, shield-tick icon | Case cleared the checklist + attestation |
| **Unread dot** | 7px `--color-danger` dot, positioned on the tab/notification | New activity |

### 8.8 Bottom navigation + FAB

- Five tabs; centre is the **Ask FAB** (§8.1). Active tab = navy icon + label;
  inactive = faint. Labels are 10px/600. An unread tab shows the danger dot.
- Height `--nav-h` + bottom safe-area inset. Surface bg, 1px top border.

### 8.9 Segmented control

Grey track (`#e3e9ec`), 3px padding; active segment = surface pill with a
soft shadow and navy text. Used for in-pane toggles (My questions / Notifications)
and compose mode (Quick question / Case discussion).

### 8.10 Forms & inputs

- Inputs: `--radius-sm`, `1px --color-border-strong`, faint fill (`#fbfcfd`),
  15px text; **focus** = navy border + white fill.
- **Labels:** `--text-label` (uppercase, tracked, muted, 700), above the field.
- **Hints:** `--text-caption`, faint, sentence case, below the field.
- Reply-dock input: pill, inline send button (navy circle).
- Every input needs a programmatic label (not placeholder-as-label) — §9.

### 8.11 Compose sheet

Bottom sheet, `--radius-lg` top corners, grabber, header (Cancel · title ·
Post). Mode toggle (Quick question / Case discussion). In **case mode** the
de-identification checklist and attestation appear and **the Post button is
disabled until every checklist item and the attestation are ticked** (§11).

### 8.12 De-identification checklist & attestation

A first-class safety component, not a form afterthought.

- **Checklist** — navy-tint panel, shield icon heading, one checkbox row per
  rule (names, location, age-as-band, relative timelines, no club/facility, no
  identifying images). Accent-coloured checkboxes.
- **Attestation** — a distinct **kudos-tint** panel with an italic confirmation
  that the case is de-identified and that a breach may result in removal and
  regulator referral.
- **Gate:** Post stays disabled until `all checklist items ✓ AND attestation ✓`.
  This gate is mandatory and must never be bypassable.

### 8.13 Notifications

Row list: circular tinted icon (kudos-gold, navy, or mention-purple) + text
(handle in 700) + timestamp. Unread rows get a navy-tint background. Kudos
notifications use the gold star icon; replies use the discussion glyph.

### 8.14 Profile

- Centred large monogram tile, handle (`--text-display`), "Verified member ·
  since {year}", and a **kudos hero** pill (gold star + total + band).
- Stat block (Questions / Responses / Best answers) in a bordered surface.
- **Anonymity reassurance card** (navy-tint): "You are anonymous to your peers…"
- Followed body-areas as chips; settings list with chevron rows; sign-out is a
  danger row.

### 8.15 Toast

Dark pill (`--color-fg`-ish `#14212b`), white 600 text, centred above the nav,
fades up and auto-dismisses (~2.2s). For lightweight confirmations only
("Question posted to Discussions"). Never use a toast for errors that need
action.

### 8.16 Empty & "coming soon" states

Calm, centred, one line of plain copy explaining what *will* be here (the
codebase already does this: *"Research and news scored to your clinical
interests will appear here."*). No illustrations of people; a light neutral
glyph at most.

---

## 9. Accessibility

Target: **WCAG 2.2 AA**. A verified professional network used pitchside, on the
ward, and one-handed cannot be anything less than robustly accessible.

### 9.1 Colour contrast

- Body text vs background ≥ **4.5:1**; large text (≥18.66px bold / 24px) and UI
  components ≥ **3:1**.
- **Known adjustments (use these, not the raw palette, for text):**
  - Kudos as **text** must use `--color-kudos-text` (`#8a5a12`) — raw gold
    `#d98a1f` on white is ~2.4:1 and **fails**. The *star icon* + count may use
    gold (graphical, paired with shape); gold *words* may not.
  - Verify as text uses `--color-verify-text` (`#256f59`).
  - `--color-faint` (`#93a1a9`, ~2.6:1) is for **non-essential** decoration and
    large text only — never for information a user must read.
  - White on spark: use `--color-spark-dark` (`#c00f18`) under white text for AA.
- Verify contrast in **both** light and dark themes; the live showcase includes
  a contrast check.

### 9.2 Never colour alone

Every colour-coded state carries a second cue:

| State | Colour | Second cue |
|---|---|---|
| Best answer | verify | "Best answer" label + tick + tint wash |
| Kudos | gold | filled star shape + numeric count |
| Unread | danger dot | position + (for rows) tint background |
| Active nav | navy | filled/active icon + label emphasis |
| De-identified | verify | shield-tick icon + text |

### 9.3 Focus, targets & input

- **Visible focus** on every interactive element: a 2px `--color-accent` ring
  with a 2px offset. Never remove outlines without a replacement.
- **Touch targets ≥ 44×44px** (icon buttons included), spacing ≥ 8px between
  adjacent targets.
- Inputs have real, programmatically-associated `<label>`s; placeholder text is
  never the only label. Hints via `aria-describedby`.
- Checklist/attestation checkboxes are keyboard-operable and expose their
  checked state; the disabled Post button uses `aria-disabled` and remains
  discoverable.

### 9.4 Structure & semantics

- One `<h1>` per screen (the thread question); no skipped heading levels.
- Landmarks: `<header>`, `<nav aria-label="Primary">`, `<main>`. The bottom nav
  uses `aria-current="page"` on the active tab.
- Icon-only buttons have `aria-label`s (Search, Back, Send, Give kudos…).
- Live regions: toast and async status (verification polling) announce politely.

### 9.5 Motion & preferences

Honour `prefers-reduced-motion` (§7.3) and `prefers-color-scheme` (light/dark).
Support OS text-size / dynamic type: use relative units where possible and never
clip text at 200% zoom.

---

## 10. Voice & tone

AskaPeer's voice is a verified colleague talking to another: **plain, warm,
precise, and unafraid to be firm about the one rule that matters.** British
English, always.

### 10.1 Principles

1. **Plain over clever.** Short sentences. No marketing gloss, no jargon, no
   exclamation marks. "We're verifying your registration." not "Hang tight!"
2. **Reassure at the point of doubt.** Anonymity, privacy and verification copy
   should lower anxiety exactly where it arises ("Your documents are never shown
   to other members.").
3. **Firm, once, about the rule.** The no-identity rule is stated plainly and
   without hedging — and not repeated everywhere. When it's said, it's absolute:
   *"immediate and permanent removal… no exceptions and no appeals."*
4. **Respect the reader's expertise.** These are qualified professionals. Don't
   over-explain clinical matters; do explain product mechanics clearly.
5. **Humane about hard states.** Rejection, "needs more info", and errors are
   written to keep the person's dignity and give them a next step.

### 10.2 Tone by context

| Context | Tone | Example (from the product) |
|---|---|---|
| Onboarding / the rule | Serious, clear, unhedged | *"Askapeer works because nobody knows who anyone is."* |
| Verification waiting | Calm, reassuring | *"This usually takes a short while. We'll email you the moment it's done."* |
| Anonymity reassurance | Warm, definite | *"You are anonymous to your peers."* |
| Empty states | Forward-looking, plain | *"Replies to your posts… will appear here."* |
| Errors | Plain, blameless, actionable | *"Something went wrong. Please try again."* |
| Safety / attestation | Precise, consequential | *"I confirm this case is de-identified… a breach may result in removal and referral to my regulator."* |

### 10.3 Word choices

| Use | Avoid |
|---|---|
| member, peer, practitioner | user, customer |
| handle | username, screen name |
| kudos | likes, upvotes, points, karma |
| case discussion | post (when it's a case) |
| verified | approved (for members) |
| de-identified | anonymised (be specific) |
| sign in / sign out | log in / log out |
| specialise, colour, organise (en-GB) | specialize, color, organize |

### 10.4 Microcopy rules

- **Buttons are verbs**: "Confirm handle", "Post", "Give kudos", "Send".
- **Labels are nouns**, uppercase-tracked, terse: "Handle", "Body area".
- **Sentence case** for all UI text except the wordmark and micro-labels.
- Numbers with units unpadded: "6 min read", "500 kudos", "top 8%".
- Never blame the user in an error; always offer the next action.

---

## 11. Anonymity & safety UX

This section is the reason AskaPeer's design guide isn't a generic one. These
patterns are **non-negotiable** and outrank aesthetic preference.

### 11.1 Anonymity, shown not stated

- Members are represented by **handle + monogram tile** only, everywhere,
  without exception.
- The handle is **permanent** and this is said plainly at the point of choosing
  it ("Your handle is permanent… kudos and post history belong to it").
- Provide quiet, definite reassurance where identity anxiety peaks — the
  profile's *"You are anonymous to your peers"* card, the compose hint *"Posted
  under your handle only. No name, employer, or specialty is ever shown."*
- **Kudos is the only status.** No seniority, no verified-expert tiers, no
  follower counts. Standing is expressed solely as kudos and kudos-derived bands.

### 11.2 The one rule, in the UI

Attempting to identify oneself or another member is fatal to the account. The
interface states this once, firmly, at onboarding, and requires an explicit
acknowledgement ("I understand, and I agree not to identify myself or any other
member"). Do not soften it, and do not scatter it as nag copy.

### 11.3 Verification states

Verification has a small set of holding states, each with reassuring,
plain-English copy and a clear next step: *pending*, *awaiting capture*, *needs
more info*, *approved/verified*, *rejected*. Documents are checked against the
professional register and **"never shown to other members"** — say so. Status
polling must announce changes (§9.4).

### 11.4 Case discussions & patient safety (the gate)

- A case discussion **cannot be posted** until the full de-identification
  checklist and the attestation are complete (§8.12). This gate is mandatory,
  visible, and unbypassable.
- The de-identification rules are explicit and clinical: no names/initials, no
  location, age as a band, relative timelines, no club/facility, no identifying
  images.
- Posted cases display a **"De-identification checklist completed & attested"**
  confirmation on the record, and use the structured case template (presenting
  complaint, de-identified patient, timeline, objective findings, question).
- Reporting a safety concern is always available and routed to priority
  moderation.

### 11.5 Moderation transparency

Moderators can access real identities **for moderation only**, and every such
access is **immutably logged**. Where this is surfaced (admin console, audit),
present it as a plain, tamper-evident record — the trust model is a feature, so
show it honestly.

---

## 12. Design tokens reference

The canonical token layer. Components reference these names; theming is a matter
of changing the values, not the markup — matching the intent already stated in
`apps/web/src/app/globals.css`.

### 12.1 Drop-in token block (Tailwind v4 `@theme`, light + dark)

```css
@import "tailwindcss";

@theme {
  /* ---- Brand ---- */
  --color-navy:          #001f52;
  --color-navy-dark:     #001640;
  --color-navy-tint:     #e6ebf2;
  --color-navy-tint-2:   #f2f5f9;
  --color-spark:         #ed1b24;
  --color-spark-dark:    #c00f18;
  --color-spark-tint:    #fdecec;
  --color-kudos:         #d98a1f;
  --color-kudos-text:    #8a5a12;
  --color-kudos-tint:    #fbf0dc;
  --color-verify:        #2e8b6f;
  --color-verify-text:   #256f59;
  --color-verify-tint:   #e4f2eb;
  --color-danger:        #c0492f;
  --color-warn:          #9a5f0a;  /* functional, admin console only — NOT kudos gold */

  /* ---- Neutrals (light) ---- */
  --color-bg:            #eef1f4;
  --color-surface:       #ffffff;
  --color-fg:            #14212b;
  --color-muted:         #64757f;
  --color-faint:         #93a1a9;
  --color-border:        #e5ebee;
  --color-border-strong: #d7e0e4;

  /* ---- Semantic aliases (what components reference) ---- */
  --color-accent:        var(--color-navy);
  --color-ok:            var(--color-verify);
  --color-bad:           var(--color-danger);

  /* ---- Typography ---- */
  --font-display: 'Fraunces', Georgia, 'Times New Roman', serif; /* headings only */
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
               Helvetica, Arial, sans-serif;                     /* everything else */

  /* ---- Radius ---- */
  --radius-sm:        12px;
  --radius-md:        14px;
  --radius:           16px;
  --radius-lg:        20px;
  --radius-pill:      999px;
  --radius-avatar:    9px;
  --radius-avatar-lg: 20px;

  /* ---- Spacing (4px base) ---- */
  --space-1: 4px;  --space-2: 8px;  --space-3: 12px; --space-4: 16px;
  --space-5: 20px; --space-6: 24px; --space-8: 32px;

  /* ---- Elevation ---- */
  --shadow-card:  0 1px 2px rgba(20,33,43,.06), 0 4px 16px rgba(20,33,43,.05);
  --shadow-fab:   0 6px 16px rgba(237,27,36,.4);
  --shadow-sheet: 0 -8px 40px rgba(15,25,32,.18);

  /* ---- Layout ---- */
  --container-max: 430px;
  --appbar-h:      52px;
  --nav-h:         62px;

  /* ---- Motion ---- */
  --motion-fast:  120ms;
  --motion-base:  240ms;
  --motion-sheet: 280ms;
  --motion-toast: 250ms;
  --ease-standard: cubic-bezier(.32,.72,0,1);
}

@media (prefers-color-scheme: dark) {
  @theme {
    --color-bg:            #0b1220;
    --color-surface:       #111a2b;
    --color-fg:            #e2e8f0;
    --color-muted:         #94a3b8;
    --color-faint:         #5f7183;
    --color-border:        #1e2c40;
    --color-border-strong: #2a3a52;

    --color-accent:        #6f9bff;  /* navy is unusable as interactive on dark */
    --color-kudos:         #e2a53f;
    --color-kudos-text:    #e2a53f;
    --color-verify:        #4bbf98;
    --color-verify-text:   #4bbf98;
    --color-spark:         #ff5a5f;
    --color-warn:          #e0a33a;
  }
}
```

### 12.2 Token naming rules

- Reference **semantic** tokens (`--color-accent`, `--color-ok`, `--color-bad`)
  in components; reserve raw brand names (`--color-navy`) for the token layer and
  brand-specific one-offs (the wordmark, the FAB gradient).
- New tokens must be added here first, with a documented meaning, before use.
- Never hard-code a hex value in a component.

---

## 13. Governance & changelog

### 13.1 How this guide is maintained

- This document and [`styleguide.html`](./styleguide.html) are the source of
  truth. A change to the *look* of the product starts here, then flows to
  `globals.css` and components.
- Proposing a change: open a PR that edits **both** the spec and the showcase so
  they never drift, and note the rationale against the first principles (§0).
- A design decision that reintroduces a hierarchy signal (§0.1) is rejected by
  default; the burden is on the proposer to show it doesn't.

### 13.2 Open questions (to resolve with the team)

- **Launch scope** affects nothing visual directly, but the range of
  professional bodies (FD-1) may influence body-area taxonomy chips.
- **Native platforms** (iOS/Android): confirm whether these tokens map to native
  (they should — system font + semantic tokens translate cleanly).
- **Type licensing**: Fraunces and Inter are both open-source (SIL Open Font
  License) — confirm self-hosting via `next/font` and that the shipped subset is
  `latin` only, for en-GB.
- **Icon set**: choose and vendor a single line-icon library to replace the
  current emoji placeholders.

### 13.3 Changelog

| Version | Date | Change |
|---|---|---|
| 0.2 | 2026-07-25 | **Editorial typography pass.** Introduced a **Fraunces** (serif display) + **Inter** (sans text/UI) pairing for a WHO/Rolex register; added the eyebrow → serif title → accent-keyline pattern (§3.4) and a confident type scale. Updated §3, §12 tokens, and the live showcase. Palette, components and safety patterns unchanged — a theming pass, not a redesign. |
| 0.1 | 2026-07-25 | Initial style guide & design system: foundations, colour, type, spacing, elevation, iconography, motion, component library, accessibility, voice & tone, anonymity/safety UX, and token reference. Codifies the mobile look-and-feel prototype. |

---

*AskaPeer — The No Ego Sports Medicine Network. This guide is a living document;
if the product and the guide disagree, fix one of them.*
