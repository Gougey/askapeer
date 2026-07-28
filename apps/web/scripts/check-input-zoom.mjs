#!/usr/bin/env node
/*
 * iOS input-zoom guard.
 *
 * Safari on iOS auto-zooms the page whenever a focused form control has a font-size below
 * 16px. The zoom resizes the *visual viewport*, so anything position:fixed — the tag sheet,
 * the anonymity gate, the bottom nav — visibly changes width the instant the field is
 * tapped. Installed to the home screen, where there is no browser chrome to re-anchor
 * against, it reads as the whole panel jumping.
 *
 * This has been fixed one control at a time twice now (the tag search box, then the reply
 * and report boxes), which is what a missing guard looks like. So: every focusable text
 * control in apps/web/src must render at >= 16px.
 *
 * The fix is always the font size. It is NOT `maximum-scale=1` in the viewport meta, which
 * suppresses the zoom by removing pinch-zoom from every user — a bad trade generally and a
 * worse one for an audience that includes people who rely on it.
 *
 * A control with no explicit size class inherits the 16px base and passes. Only an explicit
 * sub-16px class fails. Note the limitation: a size inherited from a *parent* element
 * cannot be seen statically, so this catches the common case, not every case.
 *
 * Escape hatch: append `input-zoom-allow` in a comment on the offending line — e.g. a
 * control that is genuinely never focusable on a touch device.
 *
 * Usage: node scripts/check-input-zoom.mjs   (run from apps/web; wired to `npm run lint:inputs`)
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const WEB_ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const SRC = join(WEB_ROOT, 'src');

const ALLOW_PRAGMA = 'input-zoom-allow';
/** Tailwind sizes below 16px: text-xs (12), text-sm (14), and explicit text-[Npx] under 16. */
const SMALL_TEXT = /\btext-(xs|sm)\b|\btext-\[(\d+(?:\.\d+)?)px\]/g;
/** Controls that never raise a keyboard, so never trigger the zoom. */
const EXEMPT_TYPES = new Set(['hidden', 'checkbox', 'radio', 'submit', 'button', 'range', 'color']);
const CONTROL = /<(input|textarea|select)\b([^>]*?)\/?>/gs;

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry.startsWith('.next')) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.tsx$/.test(entry)) out.push(full);
  }
  return out;
}

/** @returns the offending class, or null if this size is safe. */
function offendingSize(className) {
  for (const m of className.matchAll(SMALL_TEXT)) {
    if (m[1]) return m[0]; // text-xs / text-sm
    if (m[2] !== undefined && Number(m[2]) < 16) return m[0];
  }
  return null;
}

const violations = [];
for (const file of walk(SRC)) {
  const source = readFileSync(file, 'utf8');
  const lines = source.split('\n');

  for (const match of source.matchAll(CONTROL)) {
    const [, tag, attrs] = match;
    const lineNo = source.slice(0, match.index).split('\n').length;

    // The pragma may sit on the opening line or anywhere in the element's attributes.
    const elementText = match[0];
    if (elementText.includes(ALLOW_PRAGMA) || (lines[lineNo - 1] ?? '').includes(ALLOW_PRAGMA)) {
      continue;
    }

    const type = /type="([^"]*)"/.exec(attrs)?.[1] ?? '';
    if (EXEMPT_TYPES.has(type)) continue;

    const className = /className="([^"]*)"/.exec(attrs)?.[1] ?? '';
    const offender = offendingSize(className);
    if (offender) violations.push({ file, line: lineNo, tag, offender });
  }
}

if (violations.length === 0) {
  console.log('✓ input-zoom guard: every focusable control in apps/web/src renders at 16px or larger');
  process.exit(0);
}

console.error(`✗ input-zoom guard: ${violations.length} control(s) below 16px\n`);
for (const v of violations) {
  console.error(`  ${relative(WEB_ROOT, v.file)}:${v.line}  <${v.tag}> has ${v.offender}`);
}
console.error(
  `\niOS Safari zooms the page when a focused control is under 16px, which resizes the` +
    `\nvisual viewport and makes fixed panels appear to change width. Use \`text-base\`.` +
    `\nFor a deliberate, reviewed exception add an \`${ALLOW_PRAGMA}\` comment on the line.`,
);
process.exit(1);
