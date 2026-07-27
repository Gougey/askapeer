import { Inject, Injectable } from '@nestjs/common';
import { asc, isNull, sql } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../db/db.module';
import { categories, tags } from '../db/schema';

export type CategoryDto = {
  id: string;
  name: string;
  description: string | null;
};

export type TagDto = {
  id: string;
  name: string;
  facet: 'region' | 'muscle' | 'structure' | 'pathology';
  /** Null for a top-level region. The composer rebuilds the tree from these. */
  parentId: string | null;
  /**
   * The name of the root the node descends from ("Upper Limb"), or its own name if it is
   * a root. Names are only sibling-scoped unique, so the same leaf name recurs across
   * branches — this is what disambiguates a chip ("Rheumatoid arthritis · Upper Limb").
   */
  region: string;
  /** Drives the drill-down affordance: a node with no children is a leaf. */
  hasChildren: boolean;
};

/**
 * The read side of the EPIC-J-managed vocabulary (EPIC-C §3). Admin write surfaces are
 * S13; this exists so the composer can offer categories and tags, and so post creation
 * can validate against them.
 *
 * Retired rows are excluded everywhere here: retiring hides a term from the composer
 * without disturbing posts that already carry it.
 *
 * `mesh_id` is deliberately absent from TagDto — it is internal research-feed interop
 * (EPIC-I) and never member-facing.
 */
@Injectable()
export class VocabularyService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async listCategories(): Promise<CategoryDto[]> {
    return this.db
      .select({ id: categories.id, name: categories.name, description: categories.description })
      .from(categories)
      .where(isNull(categories.retiredAt))
      .orderBy(asc(categories.sortOrder), asc(categories.name));
  }

  /**
   * The whole taxonomy as a flat list the composer reassembles into its 4-level tree
   * (region → axis → sub-group → leaf). ~600 rows and no per-row work, so it stays a
   * single call: the picker then searches and drills entirely client-side, which is what
   * makes typing feel instant. EPIC-C §5's `?prefix=` typeahead only becomes worthwhile
   * if the taxonomy grows past what one payload can carry comfortably.
   *
   * Walked with a recursive CTE rather than a self-join because the depth is now 4, not 2.
   * Retiring is inherited by construction: the recursion only descends through non-retired
   * parents, so retiring a sub-group hides its whole subtree from the composer while the
   * posts already carrying those tags are left untouched.
   */
  async listTags(): Promise<TagDto[]> {
    const result = await this.db.execute<TagDto>(sql`
      with recursive tree as (
        select ${tags.id} as id, ${tags.name} as name, ${tags.facet} as facet,
               ${tags.parentId} as parent_id, ${tags.sortOrder} as sort_order,
               ${tags.name} as region
        from ${tags}
        where ${tags.parentId} is null and ${tags.retiredAt} is null
        union all
        select child.id, child.name, child.facet, child.parent_id, child.sort_order, tree.region
        from ${tags} as child
        join tree on child.parent_id = tree.id
        where child.retired_at is null
      )
      select tree.id, tree.name, tree.facet,
             tree.parent_id as "parentId",
             tree.region,
             exists (
               select 1 from ${tags} as kid
               where kid.parent_id = tree.id and kid.retired_at is null
             ) as "hasChildren"
      from tree
      order by tree.sort_order asc, tree.name asc
    `);
    return result.rows;
  }
}
