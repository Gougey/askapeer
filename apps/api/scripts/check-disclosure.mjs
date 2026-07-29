#!/usr/bin/env node
/*
 * Disclosure guard — reporter and moderator identity must never reach a member.
 *
 * Two of the platform's guarantees meet here. A member may see that they were reported
 * and what a moderator decided; they may never see *who* reported them, what that person
 * wrote, or which moderator acted. Handing a reported member their reporter's handle
 * invites retaliation, and the reporting flow only has value if it is safe to use.
 *
 * Until now that boundary was a comment in one service. Comments do not fail builds. This
 * came out of a real near-miss in the opposite direction (an account notice that showed
 * the member nothing at all), and the lesson is the same: if a rule matters, a check
 * should hold it.
 *
 * WHAT IS CHECKED
 *
 *   API  — every controller whose route is *not* under `admin`, plus the local modules it
 *          imports one hop deep (a controller injects its service directly, which is where
 *          a query would be written). Derived from the @Controller decorator rather than a
 *          hand-kept list, so a new /me/ surface is covered the day it is written.
 *   WEB  — everything under apps/web/src except app/admin, which is the moderator console
 *          and legitimately shows both.
 *
 * LIMITATION, stated rather than hidden: the API side follows imports one hop. A service
 * that delegates a query to a third file two hops from the controller is not scanned.
 * Widen this if the module layout grows deeper.
 *
 * Escape hatch: append `disclosure-allow` in a comment on the line, as with the other
 * guards — for a reviewed exception, not to quiet an inconvenience.
 *
 * Usage: node scripts/check-disclosure.mjs   (from apps/api; wired to `npm run lint:disclosure`)
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const API_ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const REPO_ROOT = join(API_ROOT, '..', '..');
const WEB_SRC = join(REPO_ROOT, 'apps/web/src');

const ALLOW_PRAGMA = 'disclosure-allow';

/**
 * The identifiers that carry a reporter's or moderator's identity. `reports.comment` is
 * matched as a qualified reference because `comment` alone is the forum's own vocabulary
 * and appears legitimately everywhere.
 */
const FORBIDDEN = [
  { pattern: /\breporterHandleId\b/, what: "the reporter's handle id" },
  { pattern: /\breporter_handle_id\b/, what: "the reporter's handle id" },
  { pattern: /\breporterHandle\b/, what: "the reporter's handle" },
  { pattern: /\bmoderatorId\b/, what: 'the acting moderator' },
  { pattern: /\bmoderator_id\b/, what: 'the acting moderator' },
  { pattern: /\breports\.comment\b/, what: "the reporter's own words" },
];

/**
 * Strip comments before scanning. The guard checks *code*, not prose — and the file that
 * most carefully documents this boundary describes the very fields it withholds, so
 * scanning comments would flag the explanation as the violation.
 */
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/.*$/gm, (m, p) => p + ' '.repeat(Math.max(0, m.length - p.length)));
}

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry.startsWith('.next')) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}

/** Local (relative) imports of a file, resolved to real paths. One hop only. */
function localImports(file) {
  const src = readFileSync(file, 'utf8');
  const out = [];
  for (const m of src.matchAll(/from\s+'(\.[^']+)'/g)) {
    for (const ext of ['.ts', '.tsx', '/index.ts']) {
      const candidate = resolve(dirname(file), m[1] + ext);
      if (existsSync(candidate)) {
        out.push(candidate);
        break;
      }
    }
  }
  return out;
}

// --- work out which API files are member-facing -------------------------------
const apiFiles = walk(join(API_ROOT, 'src'));
const memberFacing = new Set();
for (const file of apiFiles) {
  const src = readFileSync(file, 'utf8');
  const decorator = src.match(/@Controller\(\s*'([^']*)'\s*\)/);
  if (!decorator) continue;
  const route = decorator[1];
  if (route === 'admin' || route.startsWith('admin/')) continue; // the moderator console
  memberFacing.add(file);
  for (const imported of localImports(file)) memberFacing.add(imported);
}

// --- and which web files are ---------------------------------------------------
// Anything admin — the route group *and* shared helpers like lib/admin.ts, which holds
// the console's DTOs. Matched on a path segment or file stem so both are covered.
const isAdminWeb = (f) => /(^|\/)admin(\/|\.)/.test(relative(WEB_SRC, f));
const webFiles = walk(WEB_SRC).filter((f) => !isAdminWeb(f));

const violations = [];
for (const file of [...memberFacing, ...webFiles]) {
  const raw = readFileSync(file, 'utf8').split('\n');
  stripComments(readFileSync(file, 'utf8'))
    .split('\n')
    .forEach((line, i) => {
      // Checked against the raw line: the pragma lives in a comment, and comments are
      // stripped above.
      if ((raw[i] ?? '').includes(ALLOW_PRAGMA)) return;
      for (const { pattern, what } of FORBIDDEN) {
        if (pattern.test(line)) {
          violations.push({
            file: relative(REPO_ROOT, file),
            line: i + 1,
            what,
            text: (raw[i] ?? line).trim(),
          });
        }
      }
    });
}

if (violations.length > 0) {
  console.error('✗ disclosure guard: member-facing code references moderation identity\n');
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}  exposes ${v.what}`);
    console.error(`    ${v.text.slice(0, 100)}`);
  }
  console.error(
    '\n  A member may see that they were reported and what a moderator decided — never who\n' +
      '  reported them, what that person wrote, or which moderator acted.\n' +
      `  For a reviewed exception, append \`${ALLOW_PRAGMA}\` in a comment on the line.`,
  );
  process.exit(1);
}

console.log(
  `✓ disclosure guard: no reporter or moderator identity in ${memberFacing.size} member-facing API files ` +
    `or ${webFiles.length} non-admin web files`,
);
