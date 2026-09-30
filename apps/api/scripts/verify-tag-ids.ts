/**
 * Every tag id a migration writes must be one the API will accept.
 *
 * The taxonomy's ids are `uuid5(uuid5(DNS, 'taxonomy.askapeer.com'), '<path>')` so that a term
 * lands on the same id in every environment. Migration 0045 wrote nine of them by hand
 * instead — an ascending pattern, `4a1e5f70-…`, `5b2f6081-…`, `6c307192-…` — and four ran
 * past the legal variant nibble into `c`, `d`, `e`, `f` and `0`.
 *
 * ⚠️ **Postgres does not check this and neither did anything else.** Its `uuid` type accepts
 * any 32 hex digits, so the migration applied, the tags appeared in the picker, and the defect
 * waited for someone to *select* one: `class-validator`'s `@IsUUID` guards every tag id
 * crossing the API, so choosing *Hand joints* returned 400 and took the Research feed down.
 * Forum search and interest-saving would have broken on the same tag.
 *
 * So: a static read of the migrations, because that is where the ids are written and the only
 * place this can be caught before it reaches a member.
 *
 * Run: npm run verify:tag-ids -w apps/api
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DRIZZLE = join(import.meta.dirname, '..', 'drizzle');

/** 8-4-4-4-12 hex, anywhere in the file. Specific enough that nothing else matches it. */
const SHAPED = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;
/** What `@IsUUID(…, 'all')` actually requires: any version, but a legal variant. */
const VALID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * 0045's ids, which 0047 replaces.
 *
 * Left in place deliberately: a migration is a record of what happened, and rewriting 0045
 * would desync every database that has already run it. The guard has to know the difference
 * between "this file introduced a bad id" and "this file is the history of one".
 */
const SUPERSEDED = new Set(['0045_joint_groups.sql', '0047_joint_group_ids.sql']);

const offenders: { file: string; id: string; line: number }[] = [];

for (const file of readdirSync(DRIZZLE).filter((f) => f.endsWith('.sql')).sort()) {
  if (SUPERSEDED.has(file)) continue;
  const lines = readFileSync(join(DRIZZLE, file), 'utf8').split('\n');
  lines.forEach((text, index) => {
    for (const id of text.match(SHAPED) ?? []) {
      if (!VALID.test(id)) offenders.push({ file, id, line: index + 1 });
    }
  });
}

if (offenders.length > 0) {
  console.error('Tag ids the API would refuse:\n');
  for (const { file, id, line } of offenders) {
    console.error(`  ${file}:${line}  ${id}   (variant nibble '${id.split('-')[3][0]}')`);
  }
  console.error(
    '\nA UUID’s fourth group must begin 8, 9, a or b. Derive ids rather than typing them:',
  );
  console.error("  uuid5(uuid5(NAMESPACE_DNS, 'taxonomy.askapeer.com'), '<Region>/<…>/<Name>')");
  console.error('  — see docs/tools/vocabulary/taxonomy.py, which is what generates them.');
  process.exit(1);
}

console.log(`✓ tag ids: every id in ${readdirSync(DRIZZLE).filter((f) => f.endsWith('.sql')).length} migrations is one the API accepts`);
