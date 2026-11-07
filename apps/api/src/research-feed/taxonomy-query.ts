/**
 * The taxonomy the classifier runs against, one definition for the ingest, the reclassify and
 * the operator tool. Plain SQL with no imports, so the CLI can run it without the app.
 *
 * Navigational nodes are filtered in the final select, not in the recursion: the walk still
 * descends through them, so their children classify normally. Excluding them from the CTE
 * itself would silently drop every joint beneath a body-part group.
 */
export const TAXONOMY_QUERY = `
  with recursive walk as (
    select id, name, synonyms, scope_terms, navigational, 0 as depth
    from community.tags where parent_id is null and retired_at is null
    union all
    select t.id, t.name, t.synonyms, t.scope_terms, t.navigational, w.depth + 1
    from community.tags t join walk w on t.parent_id = w.id
    where t.retired_at is null
  )
  select id, name, synonyms, scope_terms, depth from walk where not navigational`;

export type TaxonomyRow = {
  id: string;
  name: string;
  synonyms: string[] | null;
  scope_terms: string[] | null;
  depth: number | string;
};

/** A row as the classifier takes it. Shared, so a caller cannot drop the scope terms. */
export function toClassifiable(row: TaxonomyRow) {
  return {
    id: row.id,
    name: row.name,
    synonyms: row.synonyms ?? [],
    scopeTerms: row.scope_terms ?? [],
    depth: Number(row.depth),
  };
}
