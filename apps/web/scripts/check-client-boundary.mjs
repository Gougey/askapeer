#!/usr/bin/env node
/*
 * Client-boundary guard.
 *
 * Every export of a `'use client'` module becomes a **client reference** when a server
 * component imports it — a stub the bundler swaps in at render, not the value you wrote. That
 * is exactly right for a component, and silently wrong for anything else: an array arrives as
 * a proxy with no `.includes`, a function as a proxy you cannot call.
 *
 * Neither `tsc` nor `next build` catches it. The types are correct and the build never renders
 * the page, so the first sign is a 500 in production. That is how the Feed shipped with
 * `TypeError: EVIDENCE_TYPES.includes is not a function` — the constant lived beside the
 * `<select>` that used it, which is the obvious place to put it and the one place it cannot go.
 *
 * So: a module without `'use client'` may import only *components* from a module with it.
 * PascalCase names pass, because that is what a component is called here. `import type` passes,
 * because types are erased before any of this matters. Everything else fails, and the fix is
 * always the same — move the value into a plain module both sides can import as itself, the
 * way `src/lib/evidence.ts` now does.
 *
 * Limitation: this reads import statements, so it catches the static case. A value reached
 * through a re-export chain of more than one hop is not followed.
 *
 * Escape hatch: append `client-boundary-allow` in a comment on the import line.
 *
 * Usage: node scripts/check-client-boundary.mjs   (run from apps/web; wired to `npm run lint:boundary`)
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const WEB_ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const SRC = join(WEB_ROOT, 'src');

const ALLOW_PRAGMA = 'client-boundary-allow';
const EXTENSIONS = ['.tsx', '.ts'];
/** `import { a, b } from '...'` / `import Thing from '...'` — the specifier and its source. */
const IMPORT = /^\s*import\s+(type\s+)?([^;]*?)\s+from\s+['"]([^'"]+)['"]/gm;

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (EXTENSIONS.some((e) => entry.endsWith(e))) out.push(full);
  }
  return out;
}

/** Does this file carry the directive? It must be the first statement, so the head is enough. */
const isClientModule = (source) => /^\s*(['"])use client\1/.test(source);

/** Resolve an import source to a file on disk, or null for a package. */
function resolveImport(fromFile, spec) {
  let base;
  if (spec.startsWith('.')) base = resolve(dirname(fromFile), spec);
  else if (spec.startsWith('@/')) base = join(SRC, spec.slice(2));
  else return null;

  for (const candidate of [
    ...EXTENSIONS.map((e) => base + e),
    ...EXTENSIONS.map((e) => join(base, 'index' + e)),
  ]) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

/**
 * PascalCase, and specifically *not* SCREAMING_SNAKE_CASE.
 *
 * The first version of this check was `/^[A-Z]/`, which let `EVIDENCE_TYPES` through — the
 * very constant that caused the outage — because a shouting constant also starts with a
 * capital. A component name has a lower-case letter in it somewhere.
 */
const isComponentName = (name) => /^[A-Z]/.test(name) && !/^[A-Z0-9_]+$/.test(name);

/** The named bindings an import statement pulls in, ignoring per-name `type` markers. */
function bindings(clause) {
  const names = [];
  const braces = clause.match(/\{([^}]*)\}/s);
  if (braces) {
    for (const part of braces[1].split(',')) {
      const name = part.trim();
      if (!name || /^type\s/.test(name)) continue;
      names.push((name.split(/\s+as\s+/).pop() ?? name).trim());
    }
  }
  const def = clause.replace(/\{[^}]*\}/s, '').replace(/,/g, '').trim();
  if (def && !def.startsWith('*')) names.push(def);
  return names;
}

const files = walk(SRC);
const clientModules = new Set(files.filter((f) => isClientModule(readFileSync(f, 'utf8'))));
const failures = [];

for (const file of files) {
  const source = readFileSync(file, 'utf8');
  if (clientModules.has(file)) continue; // client importing client is fine

  for (const match of source.matchAll(IMPORT)) {
    const [statement, typeOnly, clause, spec] = match;
    if (typeOnly) continue;
    if (statement.includes(ALLOW_PRAGMA)) continue;

    const target = resolveImport(file, spec);
    if (!target || !clientModules.has(target)) continue;

    const offenders = bindings(clause).filter((name) => !isComponentName(name));
    if (offenders.length === 0) continue;

    const line = source.slice(0, match.index).split('\n').length;
    failures.push(
      `${relative(WEB_ROOT, file)}:${line}  imports ${offenders.map((n) => `\`${n}\``).join(', ')} ` +
        `from '${spec}', which is a 'use client' module.`,
    );
  }
}

if (failures.length > 0) {
  console.error(
    `\nA server module may import only components from a 'use client' module.\n` +
      `Anything else arrives as a client reference — a stub, not the value.\n` +
      `Move it into a plain module both sides can import (see src/lib/evidence.ts).\n`,
  );
  for (const failure of failures) console.error(`  ${failure}`);
  console.error(`\n${failures.length} crossing(s) of the client boundary.\n`);
  process.exit(1);
}

console.log(`Client boundary clean — ${clientModules.size} client modules, ${files.length} files checked.`);
