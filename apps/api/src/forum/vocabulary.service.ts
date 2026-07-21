import { Inject, Injectable } from '@nestjs/common';
import { asc, eq, isNull } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
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
  /** Upper limb / Lower limb, so the composer can group regions without a second call. */
  parentName: string | null;
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
   * The whole vocabulary, facet-ordered. Small enough (tens of rows) to return in one go,
   * which lets the composer render its grouped multi-select without a round trip per
   * keystroke; EPIC-C §5's `?prefix=` typeahead becomes worthwhile once the list outgrows
   * what a picker can reasonably show.
   */
  async listTags(): Promise<TagDto[]> {
    const parent = alias(tags, 'parent');
    return this.db
      .select({
        id: tags.id,
        name: tags.name,
        facet: tags.facet,
        parentName: parent.name,
      })
      .from(tags)
      .leftJoin(parent, eq(tags.parentId, parent.id))
      .where(isNull(tags.retiredAt))
      .orderBy(asc(tags.sortOrder), asc(tags.name));
  }
}
