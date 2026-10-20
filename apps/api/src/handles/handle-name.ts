/**
 * Handle-name rules (EPIC-B §3). Pure functions, no I/O — the DB-backed checks
 * (uniqueness, blocklist) live in HandlesService and call into these.
 */

export const HANDLE_MIN_LENGTH = 3;
/**
 * 20, down from 30 (Adrian and Andrew, 20 October 2026). With the author's two kudos totals now
 * beside the handle on every card, 20 is what lets the longest handle and three-digit totals
 * share one line on a phone. Applies to new handles; the pilot clear-down removes every
 * existing one, so nobody is caught by it. Moderator renames use the same rule.
 */
export const HANDLE_MAX_LENGTH = 20;

/** 3–20 characters, alphanumeric plus underscore/hyphen. Built from the two limits above. */
const FORMAT = new RegExp(`^[A-Za-z0-9_-]{${HANDLE_MIN_LENGTH},${HANDLE_MAX_LENGTH}}$`);

export type HandleRejection = 'invalid_format' | 'taken' | 'blocklisted';

export const isValidFormat = (name: string): boolean => FORMAT.test(name);

export type BlocklistTerm = { term: string; matchMode: 'exact' | 'contains' };

/**
 * Both comparisons run against the name as typed *and* against the name with `_`/`-`
 * removed. Without the second pass `a_d_m_i_n` sails through a rule meant to catch
 * `admin` — separators are the cheapest possible evasion, so collapsing them costs one
 * string operation and closes the obvious hole.
 *
 * This is not, and cannot be, exhaustive: leet-speak and homoglyphs will still get
 * through. That is by design — the blocklist stops the careless and the opportunistic,
 * while deliberate impersonation is a reporting/moderation matter (EPIC-B §3, EPIC-F).
 */
export function findBlocklistMatch(name: string, terms: BlocklistTerm[]): string | null {
  const lower = name.toLowerCase();
  const collapsed = lower.replace(/[_-]/g, '');
  for (const { term, matchMode } of terms) {
    const t = term.toLowerCase();
    const hit =
      matchMode === 'contains'
        ? lower.includes(t) || collapsed.includes(t)
        : lower === t || collapsed === t;
    if (hit) return term;
  }
  return null;
}
