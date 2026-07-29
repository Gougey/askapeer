/**
 * AskaPeer design tokens — the platform-neutral source of truth.
 *
 * Canonical spec: docs/style-guide/STYLE_GUIDE.md. This file holds the *values*; the
 * style guide holds the reasoning. `apps/web/src/app/globals.css` is now **generated**
 * from here (`npm run tokens:build`) rather than hand-maintained.
 *
 * Why this exists in a package rather than in the CSS: CSS does not travel. React Native
 * has no cascade, no custom properties and no stylesheets — so a native client can never
 * import `globals.css`, and would otherwise re-type these values off the style guide by
 * hand. Colour and type decisions are the expensive judgements (which colour means kudos,
 * what the neutral ramp is); the CSS that expresses them is disposable. Keeping the
 * decisions here means a future client consumes the same values, not a copy of them.
 *
 * Consumers:
 *   - web  → `toCss()` writes the token layer into globals.css.
 *   - any other client → `resolveTheme('light' | 'dark')` returns a flat map of fully
 *     resolved values (aliases followed, no `var()`), which is the only form a platform
 *     without custom properties can use.
 */

/** @typedef {string | { alias: string }} TokenValue */
/** @typedef {{ name: string, value: TokenValue, comment?: string }} Token */
/** @typedef {{ comment?: string, tokens: Token[] }} TokenGroup */

/** A token whose value is another token — emitted as `var(--other)`, resolved for native. */
const alias = (name) => ({ alias: name });

/**
 * The light theme, which is also the base: dark is expressed as a set of overrides on top,
 * exactly as the CSS cascade applies it.
 *
 * @type {TokenGroup[]}
 */
export const lightGroups = [
  {
    comment: 'Brand',
    tokens: [
      { name: 'color-navy', value: '#001f52' },
      { name: 'color-navy-dark', value: '#001640' },
      { name: 'color-navy-tint', value: '#e6ebf2' },
      { name: 'color-navy-tint-2', value: '#f2f5f9' },
      { name: 'color-spark', value: '#ed1b24' },
      { name: 'color-spark-dark', value: '#c00f18' },
      { name: 'color-kudos', value: '#d98a1f' },
      { name: 'color-kudos-text', value: '#8a5a12' },
      { name: 'color-kudos-tint', value: '#fbf0dc' },
      { name: 'color-verify', value: '#2e8b6f' },
      { name: 'color-verify-text', value: '#256f59' },
      { name: 'color-verify-tint', value: '#e4f2eb' },
      { name: 'color-danger', value: '#c0492f' },
    ],
  },
  {
    comment: 'Neutrals (light)',
    tokens: [
      { name: 'color-bg', value: '#eef1f4' },
      { name: 'color-surface', value: '#ffffff' },
      { name: 'color-fg', value: '#14212b' },
      { name: 'color-muted', value: '#64757f' },
      { name: 'color-faint', value: '#93a1a9' },
      { name: 'color-border', value: '#e5ebee' },
      { name: 'color-border-strong', value: '#d7e0e4' },
    ],
  },
  {
    comment: 'Semantic aliases (what components reference)',
    tokens: [
      { name: 'color-accent', value: alias('color-navy') },
      { name: 'color-ok', value: alias('color-verify') },
      { name: 'color-bad', value: alias('color-danger') },
    ],
  },
  {
    tokens: [
      {
        name: 'color-warn',
        value: '#9a5f0a',
        comment: [
          'Functional "needs a human" / attention colour. Like --color-danger, this is a',
          '*functional* token, not a brand one — deliberately NOT kudos gold, which the style',
          "guide reserves as the product's single member-facing status colour (§2.1). Used only",
          'by the admin/moderation console for pending-review states. Value is darkened for',
          "AA-safe text on the console's tinted badges.",
        ].join('\n'),
      },
    ],
  },
  {
    comment: 'Typography',
    tokens: [
      { name: 'font-display', value: "'Fraunces', Georgia, 'Times New Roman', serif" },
      {
        name: 'font-sans',
        value:
          "'Inter', -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, Helvetica, Arial, sans-serif",
      },
    ],
  },
];

/**
 * Geometry — spacing, layout, radius, elevation (style guide §4 and §5).
 *
 * **These are deliberately NOT in the `@theme` block**, unlike colour and type, and that
 * is the load-bearing decision in this file.
 *
 * Tailwind v4 reads `@theme` namespaces as utility scales: `--radius-*` defines what
 * `rounded-*` means, `--container-*` defines `max-w-*`, `--breakpoint-*` defines
 * responsive variants. Declaring geometry there would rewrite utilities the app already
 * uses. So geometry is emitted as plain custom properties on `:root`, and components
 * reference `var(--radius)` in a style prop exactly as they already reference
 * `var(--color-fg)`.
 *
 * **Staying out of `@theme` is not by itself enough**, which is the trap worth recording:
 * Tailwind compiles `.rounded-lg` to `border-radius: var(--radius-lg)` and puts its own
 * `--radius-lg` in `:root`. A second `:root` declaration of that name wins on source
 * order and changes the utility everywhere. Hence the three renamed radius tokens below
 * (`--radius-large/-medium/-small`) — the collision is by *name*, not by block.
 *
 * One rule for every token: the design system is referenced through `var()`; Tailwind
 * utilities stay Tailwind's.
 *
 * @type {TokenGroup[]}
 */
export const geometryGroups = [
  {
    comment: [
      'Spacing — 4px base unit (§4.1). Do not invent one-off values.',
      '--space-4 (16px) is the workhorse: screen side padding and card padding.',
    ].join('\n'),
    tokens: [
      { name: 'space-1', value: '4px' },
      { name: 'space-2', value: '8px' },
      { name: 'space-3', value: '12px' },
      { name: 'space-4', value: '16px' },
      { name: 'space-5', value: '20px' },
      { name: 'space-6', value: '24px' },
      { name: 'space-8', value: '32px' },
    ],
  },
  {
    comment: [
      'Layout (§4.2, §4.3). The member-facing app is a centred column at every width —',
      'multi-column member layouts reintroduce desktop-first thinking. The admin console',
      'is a separate context and is not bound by --container-max.',
    ].join('\n'),
    tokens: [
      { name: 'container-max', value: '430px' },
      { name: 'breakpoint-frame', value: '500px' },
      { name: 'breakpoint-lg', value: '1024px' },
      { name: 'appbar-h', value: '52px' },
      { name: 'nav-h', value: '62px' },
    ],
  },
  {
    comment: [
      'Radius (§5.1). --radius (16px) is the default: cards, panels, inputs, stat blocks.',
      '',
      'NAMING: the style guide calls these --radius-lg / -md / -sm. In code they are',
      '--radius-large / -medium / -small, because Tailwind owns the first three names and',
      'means different values by them (its --radius-lg is 8px against the guide\'s 20px).',
      'Tailwind\'s `.rounded-lg` reads var(--radius-lg) from :root at runtime, so declaring',
      'the guide\'s value under that name silently restyles every rounded-lg in the app —',
      'staying out of the `@theme` block does NOT avoid this. The other four names are',
      'unclaimed by Tailwind and keep the guide\'s spelling.',
      '',
      'Monogram tiles are squircles, never circles: a circular avatar reads as "person /',
      'photo slot", a rounded square reads as "identity token" — which is the anonymity',
      'signal we want. Load-bearing; do not "fix" --radius-avatar to 999px.',
    ].join('\n'),
    tokens: [
      { name: 'radius-pill', value: '999px' },
      { name: 'radius-large', value: '20px' },
      { name: 'radius', value: '16px' },
      { name: 'radius-medium', value: '14px' },
      { name: 'radius-small', value: '12px' },
      { name: 'radius-avatar', value: '9px' },
      { name: 'radius-avatar-lg', value: '20px' },
    ],
  },
  {
    comment: [
      'Elevation (§5.2). Deliberately subtle — prefer a 1px border plus a faint card',
      'shadow over heavy drop shadows. Sheets and the FAB are the only strongly-raised',
      'elements.',
    ].join('\n'),
    tokens: [
      { name: 'shadow-card', value: '0 1px 2px rgba(20,33,43,.06), 0 4px 16px rgba(20,33,43,.05)' },
      { name: 'shadow-fab', value: '0 6px 16px rgba(237,27,36,.4)' },
      { name: 'shadow-sheet', value: '0 -8px 40px rgba(15,25,32,.18)' },
      { name: 'shadow-none', value: 'none' },
    ],
  },
];

/**
 * Dark-theme geometry overrides — shadows only; spacing, layout and radius are theme
 * independent.
 *
 * §5.2 gives the *direction* ("reduce shadow opacity and lean on borders for separation")
 * but not values, so these are derived rather than specified: the light shadows tint
 * toward navy, which is invisible on a dark ground, so dark uses near-black at a higher
 * opacity to read at all. Worth a look on a real screen before treating them as settled.
 *
 * @type {TokenGroup[]}
 */
export const darkGeometryGroups = [
  {
    tokens: [
      { name: 'shadow-card', value: '0 1px 2px rgba(0,0,0,.30), 0 4px 16px rgba(0,0,0,.24)' },
      { name: 'shadow-fab', value: '0 6px 16px rgba(255,90,95,.35)' },
      { name: 'shadow-sheet', value: '0 -8px 40px rgba(0,0,0,.45)' },
    ],
  },
];

/**
 * Dark theme, as overrides on the light base. Only the tokens that actually change are
 * listed — anything absent is inherited, which is what keeps the two themes honest about
 * where they genuinely differ.
 *
 * Split into the same two concerns the light theme has: the neutral ramp and the tinted
 * surfaces first, then the brand and status colours that need re-pitching to stay legible
 * on a dark ground (navy is unreadable there, so accent becomes a light blue).
 *
 * @type {TokenGroup[]}
 */
export const darkGroups = [
  {
    tokens: [
      { name: 'color-bg', value: '#0b1220' },
      { name: 'color-surface', value: '#111a2b' },
      { name: 'color-fg', value: '#e2e8f0' },
      { name: 'color-muted', value: '#94a3b8' },
      { name: 'color-faint', value: '#5f7183' },
      { name: 'color-border', value: '#1e2c40' },
      { name: 'color-border-strong', value: '#2a3a52' },
      { name: 'color-navy-tint', value: '#16233b' },
      { name: 'color-navy-tint-2', value: '#141f33' },
      { name: 'color-verify-tint', value: '#14332a' },
      { name: 'color-kudos-tint', value: '#2e2413' },
    ],
  },
  {
    tokens: [
      { name: 'color-accent', value: '#6f9bff' },
      { name: 'color-kudos', value: '#e2a53f' },
      { name: 'color-kudos-text', value: '#e2a53f' },
      { name: 'color-verify', value: '#4bbf98' },
      { name: 'color-verify-text', value: '#4bbf98' },
      { name: 'color-spark', value: '#ff5a5f' },
      { name: 'color-warn', value: '#e0a33a' },
    ],
  },
];

/** The dark overrides flattened — the form `resolveTheme` applies. @type {Token[]} */
export const darkOverrides = [...darkGroups, ...darkGeometryGroups].flatMap((g) => g.tokens);

/**
 * Every base token, flattened out of its documentation groups. Geometry joins colour and
 * type here: the `@theme`/`:root` split is a CSS emission detail, and a non-CSS client
 * wants one flat set of values.
 */
const lightTokens = [...lightGroups, ...geometryGroups].flatMap((group) => group.tokens);

/**
 * A flat map of fully resolved values for one theme — aliases followed, no `var()` left.
 * This is the form a platform without custom properties (React Native, or any native
 * client) needs, and the reason the tokens live in JS rather than only in CSS.
 *
 * Values stay CSS-shaped: `16px`, and shadows as a CSS `box-shadow` string. A native
 * client will need to parse the units and translate shadows to its own elevation model —
 * which is a smaller and more honest job than re-typing the values off the style guide.
 *
 * @param {'light' | 'dark'} theme
 * @returns {Record<string, string>}
 */
export function resolveTheme(theme = 'light') {
  /** @type {Map<string, TokenValue>} */
  const raw = new Map(lightTokens.map((t) => [t.name, t.value]));
  if (theme === 'dark') {
    for (const { name, value } of darkOverrides) raw.set(name, value);
  }

  /** @type {Record<string, string>} */
  const resolved = {};
  for (const name of raw.keys()) resolved[name] = follow(name, raw, new Set());
  return resolved;
}

/** Walks an alias chain to a literal, refusing to loop forever on a cycle. */
function follow(name, raw, seen) {
  if (seen.has(name)) throw new Error(`Token alias cycle at "${name}"`);
  const value = raw.get(name);
  if (value === undefined) throw new Error(`Token "${name}" aliases something undefined`);
  if (typeof value === 'string') return value;
  seen.add(name);
  return follow(value.alias, raw, seen);
}

/** How a value is written in CSS: an alias stays a `var()` so the cascade still applies. */
const toCssValue = (value) => (typeof value === 'string' ? value : `var(--${value.alias})`);

/** Indented `/* *\/` comment block, matching the hand-written file it replaces. */
function cssComment(text, indent) {
  const lines = text.split('\n');
  if (lines.length === 1) return `${indent}/* ${lines[0]} */`;
  // A blank line inside the block stays genuinely blank — `${indent}  ` on an empty line
  // is trailing whitespace, which shows up as diff noise in the generated file.
  const body = lines.map((l) => (l === '' ? '' : `${indent}  ${l}`));
  return [`${indent}/*`, ...body, `${indent}*/`].join('\n');
}

/** Emits one group's tokens (and its comments) at a given indent. */
function cssGroups(groups, indent) {
  const out = [];
  groups.forEach((group, index) => {
    if (index > 0) out.push('');
    if (group.comment) out.push(cssComment(group.comment, indent));
    for (const token of group.tokens) {
      if (token.comment) out.push(cssComment(token.comment, indent));
      out.push(`${indent}--${token.name}: ${toCssValue(token.value)};`);
    }
  });
  return out;
}

/**
 * The CSS token layer: the Tailwind `@theme` block (colour and type), the plain `:root`
 * block (geometry — see `geometryGroups` for why it is not in `@theme`), and the
 * dark-scheme override that covers both. Written verbatim into globals.css between its
 * generated-region markers.
 *
 * @returns {string}
 */
export function toCss() {
  const out = ['@theme {', ...cssGroups(lightGroups, '  '), '}', ''];

  out.push(
    cssComment(
      [
        'Geometry (§4, §5) — a plain `:root` block, NOT `@theme`, and deliberately so.',
        "Tailwind v4 treats `--radius-*`, `--container-*` and `--breakpoint-*` inside `@theme`",
        'as utility scales, and the style guide uses those names for different values than',
        'Tailwind does (--radius-lg is 20px here, 8px there). Declaring them in `@theme` would',
        'silently restyle every `rounded-lg` in the app. Reference these with var() instead.',
      ].join('\n'),
      '',
    ),
  );
  out.push(':root {', ...cssGroups(geometryGroups, '  '), '}', '');

  out.push(
    cssComment(
      [
        'Dark theme. NB: this is a plain `:root` override inside the media query — NOT a second',
        '`@theme` block. Tailwind v4 hoists every `@theme` into one unconditional `:root`, so a',
        'nested `@theme` would make dark apply in *both* schemes. A normal media-gated `:root`',
        'override is the correct v4 pattern for prefers-color-scheme.',
      ].join('\n'),
      '',
    ),
  );
  out.push('@media (prefers-color-scheme: dark) {', '  :root {');
  out.push(...cssGroups([...darkGroups, ...darkGeometryGroups], '    '));
  out.push('  }', '}');
  return out.join('\n');
}
