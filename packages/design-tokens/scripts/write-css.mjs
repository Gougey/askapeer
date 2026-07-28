#!/usr/bin/env node
/*
 * Writes the CSS token layer into apps/web/src/app/globals.css, between the generated
 * markers. Everything outside those markers (font faces, base element styles) stays
 * hand-written — only the token block is owned by packages/design-tokens.
 *
 * Codegen into a region of a hand-written file, rather than a separate imported .css,
 * because Tailwind v4 resolves `@theme` at the point it is declared; keeping it inline
 * avoids depending on import-order behaviour for something this load-bearing.
 *
 * Usage:
 *   node scripts/write-css.mjs           # rewrite the block  (npm run tokens:build)
 *   node scripts/write-css.mjs --check   # fail if it would change  (npm run tokens:check)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { toCss } from '../index.mjs';

const REPO_ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..', '..');
const TARGET = join(REPO_ROOT, 'apps/web/src/app/globals.css');
const START = '/* @tokens:start — generated from packages/design-tokens; edit there, then run `npm run tokens:build` */';
const END = '/* @tokens:end */';

const checkOnly = process.argv.includes('--check');
const current = readFileSync(TARGET, 'utf8');

const startAt = current.indexOf(START);
const endAt = current.indexOf(END);
if (startAt === -1 || endAt === -1 || endAt < startAt) {
  console.error(
    `✗ design tokens: could not find the generated region in ${TARGET}.\n` +
      `  Expected a block delimited by:\n    ${START}\n    ${END}`,
  );
  process.exit(1);
}

const next =
  current.slice(0, startAt) + `${START}\n${toCss()}\n${END}` + current.slice(endAt + END.length);

if (next === current) {
  console.log('✓ design tokens: globals.css matches packages/design-tokens');
  process.exit(0);
}

if (checkOnly) {
  console.error(
    '✗ design tokens: globals.css is out of date with packages/design-tokens.\n' +
      '  The CSS token layer is generated — edit packages/design-tokens/index.mjs, then run\n' +
      '  `npm run tokens:build` and commit the result.',
  );
  process.exit(1);
}

writeFileSync(TARGET, next);
console.log(`✓ design tokens: wrote the token layer into ${TARGET.replace(REPO_ROOT, '.')}`);
