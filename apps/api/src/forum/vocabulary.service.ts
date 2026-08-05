import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../db/db.module';
import { categories, tags } from '../db/schema';

export type CategoryDto = {
  id: string;
  name: string;
  description: string | null;
  /**
   * The kind of post this category is for, or null for either. The question composer hides
   * the case-only one — a case discussion is a clinical case by definition, so offering it
   * to a question invites the wrong answer, and asking a case's author to pick it makes
   * them restate what the previous screen already established.
   */
  postType: 'question' | 'case_discussion' | null;
  /**
   * Design-token key for the category's colour (`teal`, `blue`…), or null to inherit the
   * default accent. The value lives in `--color-category-*` per theme; see the column
   * comment on `categories.colour`.
   */
  colour: string | null;
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
  /**
   * The other words this tag is known by.
   *
   * Surfaced so a picker can *search* them, not just so the classifier can match them. If
   * an administrator groups a scattered concept by putting "quadriceps" on all eight of the
   * relevant tags, typing "quadriceps" into a picker has to find all eight — otherwise the
   * approach looks like it failed when it worked, and they conclude the tool is broken.
   */
  synonyms: string[];
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

  /**
   * Every live category, each carrying the post type it is for.
   *
   * Unfiltered on purpose: one list serves both composers, and each takes what applies to
   * it. Filtering here would need a parameter that the case composer — which no longer
   * offers a category at all — would never pass.
   */
  async listCategories(): Promise<CategoryDto[]> {
    return this.db
      .select({
        id: categories.id,
        name: categories.name,
        description: categories.description,
        postType: categories.postType,
        colour: categories.colour,
      })
      .from(categories)
      .where(isNull(categories.retiredAt))
      .orderBy(asc(categories.sortOrder), asc(categories.name));
  }

  /**
   * The category a case discussion belongs to — resolved, never chosen (EPIC-E).
   *
   * Throws rather than falling back to some other category if the vocabulary has no
   * case-discussion category: a case filed under "General" would be wrong in a way nobody
   * would notice for months, where a loud failure gets the seed fixed.
   */
  async caseCategoryId(): Promise<string> {
    const [row] = await this.db
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.postType, 'case_discussion'), isNull(categories.retiredAt)));
    if (!row) {
      throw new Error(
        'No live category is marked for case discussions — the categories vocabulary needs one.',
      );
    }
    return row.id;
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
             ) as "hasChildren",
             coalesce((select synonyms from ${tags} as self where self.id = tree.id), '{}') as synonyms
      from tree
      order by tree.sort_order asc, tree.name asc
    `);
    return result.rows;
  }
}
