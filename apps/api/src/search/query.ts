import { sql, type SQL } from 'drizzle-orm';

/**
 * A member's search words as a tsquery, with the search abbreviations folded in — use this
 * wherever a keyword search would otherwise write `websearch_to_tsquery('english', term)`.
 *
 * "Achilles rehab" becomes `'achill' & ('rehab' | 'rehabilit')`, so it finds the 721 papers
 * that say "rehabilitation" rather than the 8 that say "rehab". The pairs live in
 * `community.search_abbreviations`, and migration 0060 says which way each one works and why.
 *
 * ⚠️ **Keep the scalar subquery.** Written bare, `community.search_tsquery(...)` is a function
 * call Postgres may evaluate again for every row a GIN recheck touches, and each call runs the
 * whole rewrite table. As `(select …)` it is an InitPlan: computed once per search, and still
 * usable as the index condition.
 */
export function searchQuery(term: string): SQL {
  return sql`(select community.search_tsquery(${term}))`;
}
