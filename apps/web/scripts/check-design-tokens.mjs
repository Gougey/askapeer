#!/usr/bin/env node
/*
 * Design-token guard.
 *
 * The AskaPeer design system (docs/style-guide/STYLE_GUIDE.md) is applied as a *theming
 * pass*: components reference semantic CSS variables (var(--color-*)), and raw colour
 * values live in exactly one place — packages/design-tokens, which *generates* the token
 * layer in src/app/globals.css. This check fails the build when a component (re)introduces
 * an off-system colour, which is how the pre-brand admin colours and the odd clap-vs-star
 * slipped in before the guard existed.
 *
 * Scope is apps/web/src deliberately: packages/design-tokens is the sanctioned home for
 * literal values, so it is not scanned. `npm run tokens:check` is what keeps *that* file
 * and globals.css from drifting apart.
 *
 * It flags, in every .ts/.tsx file under src/:
 *   1. Raw hex colours (e.g. #0ea5e9, bg-[#d97706]) — use a semantic token instead.
 *      Pure white/black (#fff, #ffffff, #000, #000000, ±alpha) are allowed: universal
 *      on-fill contrast colours, not brand values.
 *   2. Default Tailwind palette classes (bg-slate-100, text-sky-500, …) — these ignore the
 *      theme entirely and don't adapt to dark mode. Use the token utilities / inline vars.
 *
 * Escape hatch: append `design-token-allow` in a comment on the offending line for a
 * deliberate, reviewed exception.
 *
 * Usage: node scripts/check-design-tokens.mjs   (run from apps/web; wired to `npm run lint:tokens`)
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const WEB_ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const SRC = join(WEB_ROOT, 'src');

const ALLOW_PRAGMA = 'design-token-allow';
// White/black (with optional 3/4/6/8-digit + alpha forms) are design-neutral on-fill colours.
const NEUTRAL_HEX = new Set(['fff', 'ffff', 'ffffff', 'ffffffff', '000', '0000', '000000', '00000000']);
const HEX = /#([0-9a-fA-F]{3,8})\b/g;
const TAILWIND_PALETTE =
  /\b(?:bg|text|border|ring|ring-offset|from|via|to|divide|placeholder|decoration|fill|stroke|shadow|outline|accent|caret)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/g;

/** @returns {string[]} every .ts/.tsx file under dir, skipping build output. */
function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry.startsWith('.next')) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}

const violations = [];
for (const file of walk(SRC)) {
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    if (line.includes(ALLOW_PRAGMA)) return;

    for (const m of line.matchAll(HEX)) {
      if (NEUTRAL_HEX.has(m[1].toLowerCase())) continue;
      violations.push({ file, line: i + 1, match: m[0], why: 'raw hex colour — use a var(--color-*) token' });
    }
    for (const m of line.matchAll(TAILWIND_PALETTE)) {
      violations.push({ file, line: i + 1, match: m[0], why: 'default Tailwind palette class — ignores the theme; use a token' });
    }
  });
}

if (violations.length === 0) {
  console.log('✓ design-token guard: no off-system colours in apps/web/src');
  process.exit(0);
}

console.error(`✗ design-token guard: ${violations.length} off-system colour(s) found\n`);
for (const v of violations) {
  console.error(`  ${relative(WEB_ROOT, v.file)}:${v.line}  ${v.match}  — ${v.why}`);
}
console.error(
  `\nReference a semantic token (see docs/style-guide/STYLE_GUIDE.md §2.4), or add a` +
    `\n\`${ALLOW_PRAGMA}\` comment on the line for a deliberate, reviewed exception.`,
);
process.exit(1);
