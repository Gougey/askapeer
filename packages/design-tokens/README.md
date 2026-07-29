# @askapeer/design-tokens

The platform-neutral source of truth for AskaPeer's design tokens.

`docs/style-guide/STYLE_GUIDE.md` remains the canonical spec — it holds the *reasoning*
(what kudos gold means, why spark red is reserved, which values are text-safe). This
package holds the *values*, in a form that is not tied to CSS.

## Why it exists

`apps/web/src/app/globals.css` used to be where the values lived. That is fine while there
is one web client, and useless the moment there is a second client that is not CSS-based:
React Native has no cascade, no custom properties and no stylesheets, so it can never
import `globals.css`. The values would get re-typed off the style guide by hand, and drift.

Colour and type decisions are the expensive judgements. The CSS that expresses them is
disposable. So the decisions live here, and the CSS is generated.

This is groundwork for FD-3 (platform sequencing) — it does not commit us to a native
client, it just means a future one consumes the same values rather than a copy of them.

## Layout

| File | What it is |
|---|---|
| `index.mjs` | The tokens, plus `resolveTheme()` and `toCss()`. Plain ESM — no build step. |
| `index.d.ts` | Hand-written types, so TypeScript consumers get them without compiling. |
| `scripts/write-css.mjs` | Writes the CSS token layer into `globals.css`. |

## Consuming it

**Web** — the CSS token layer is generated into the marked region of
`apps/web/src/app/globals.css`. Components keep referencing `var(--color-*)` exactly as
before; nothing about how the web app is written changes.

```bash
npm run tokens:build   # regenerate globals.css after editing index.mjs
npm run tokens:check   # CI: fail if globals.css was hand-edited instead
```

**Anything without CSS custom properties** — take resolved values:

```js
import { resolveTheme } from '@askapeer/design-tokens';

const t = resolveTheme('dark');
t['color-accent']; // '#6f9bff' — aliases followed, no var() left
```

## Colour and type are in `@theme`; geometry is not

The generated region has two blocks, and the split is deliberate.

| Block | Holds | Why |
|---|---|---|
| `@theme { … }` | colour, type | Tailwind's `--color-*` and `--font-*` namespaces, which is where they belong |
| `:root { … }` | spacing, layout, radius, elevation | **Must not** be in `@theme` — see below |

Tailwind v4 reads `@theme` namespaces as utility scales: `--radius-*` defines what
`rounded-*` means, `--container-*` defines `max-w-*`, `--breakpoint-*` defines responsive
variants. Declaring geometry there would rewrite utilities the app already uses.

Geometry is referenced the same way colour already is — through `var()` in a style prop,
not through a utility class:

```tsx
<div style={{ borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-card)' }} />
```

One rule for the whole design system: **tokens are referenced through `var()`; Tailwind
utilities stay Tailwind's.**

### Three radius tokens are renamed, and why

| Style guide §5.1 | In code | Value |
|---|---|---|
| `--radius-lg` | **`--radius-large`** | 20px |
| `--radius-md` | **`--radius-medium`** | 14px |
| `--radius-sm` | **`--radius-small`** | 12px |
| `--radius-pill`, `--radius`, `--radius-avatar`, `--radius-avatar-lg` | unchanged | — |

Staying out of `@theme` is **not** enough on its own. Tailwind compiles `.rounded-lg` to
`border-radius: var(--radius-lg)` and puts its own `--radius-lg: .5rem` in `:root`. A
second `:root` declaration of the same name wins on source order, so the guide's 20px
would silently apply to every `rounded-lg` in the app — 44 of them at the time of
writing. The collision is by **name**, not by block, and only these three names are
claimed by Tailwind.

## Editing

Edit `index.mjs`, run `npm run tokens:build`, commit both. Never hand-edit the generated
region of `globals.css` — CI fails if it diverges.

Two rules carried over from the style guide, because they are the ones that get eroded:

- **Kudos gold (`color-kudos`) is the single member-facing status colour.** Never reuse it
  for anything else, and never signal kudos with anything else.
- **`color-warn` is functional and admin-only.** It is deliberately not kudos gold, and
  never member-facing.

Dark is expressed as overrides on light, so only list a token there if it genuinely
differs — that is what keeps the two themes honest.
