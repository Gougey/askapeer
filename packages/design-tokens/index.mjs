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
export const darkOverrides = darkGroups.flatMap((group) => group.tokens);

/** Every light token, flattened out of its documentation groups. */
const lightTokens = lightGroups.flatMap((group) => group.tokens);

/**
 * A flat map of fully resolved values for one theme — aliases followed, no `var()` left.
 * This is the form a platform without custom properties (React Native, or any native
 * client) needs, and the reason the tokens live in JS rather than only in CSS.
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
  return [`${indent}/*`, ...lines.map((l) => `${indent}  ${l}`), `${indent}*/`].join('\n');
}

/**
 * The CSS token layer: the Tailwind `@theme` block plus the dark-scheme override.
 * Written verbatim into globals.css between its generated-region markers.
 *
 * @returns {string}
 */
export function toCss() {
  const out = ['@theme {'];
  lightGroups.forEach((group, index) => {
    if (index > 0) out.push('');
    if (group.comment) out.push(cssComment(group.comment, '  '));
    for (const token of group.tokens) {
      if (token.comment) {
        out.push(cssComment(token.comment, '  '));
      }
      out.push(`  --${token.name}: ${toCssValue(token.value)};`);
    }
  });
  out.push('}', '');

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
  darkGroups.forEach((group, index) => {
    if (index > 0) out.push('');
    for (const token of group.tokens) {
      out.push(`    --${token.name}: ${toCssValue(token.value)};`);
    }
  });
  out.push('  }', '}');
  return out.join('\n');
}
