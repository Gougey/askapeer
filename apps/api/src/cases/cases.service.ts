import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, inArray, isNull } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../db/db.module';
import { caseAttestations, caseDetails, categories, posts, postTags, tags } from '../db/schema';
import { PostsService, type Thread } from '../forum/posts.service';
import { ATTESTATION_TEXT, CHECKLIST_ITEMS } from './case-policy';
import type { AttestCaseDto, CreateCaseDto, SetChecklistDto, UpdateCaseDto } from './cases.dto';

/** How much of the presenting condition becomes the list-surface title. */
const DERIVED_TITLE_LENGTH = 110;

/** The six template fields, in the order they are asked, composed, and rendered. */
const TEMPLATE_FIELDS = [
  ['presentingCondition', 'Presenting condition'],
  ['historyPresentingCondition', 'History of presenting condition'],
  ['objectiveFindings', 'Objective findings'],
  ['communityQuestion', 'Question'],
] as const;

type CaseFields = {
  ageBand: 'child' | 'youth' | 'adult';
  onsetDays: number;
  presentingCondition: string;
  historyPresentingCondition: string;
  objectiveFindings: string;
  communityQuestion: string;
};

/** A draft as its author sees it on the "unfinished cases" list (EPIC-E §3, gap G-8/G-21). */
export type DraftCard = {
  id: string;
  title: string;
  status: 'draft' | 'needs_correction';
  category: { id: string; name: string };
  ageBand: string;
  onsetDays: number;
  /** Which checklist items are still outstanding — the row can say "2 of 6 left". */
  checklistRemaining: number;
  checklistTotal: number;
  createdAt: string;
  editedAt: string | null;
};

/**
 * EPIC-E — case discussions.
 *
 * The whole epic is one gate: a case discussion is invisible to every other member until
 * its author has completed the de-identification checklist and attested, under their
 * verified legal identity, that it is de-identified. `posts.status` starts at `draft` and
 * only `attest()` moves it to `published`.
 *
 * The security property that matters is that the gate is *here*, not in the composer. The
 * UI disables its publish button, but `attest()` re-reads the checklist from the database
 * and refuses if any live item is unconfirmed — a hand-rolled request cannot skip it.
 */
@Injectable()
export class CasesService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly postsService: PostsService,
  ) {}

  /**
   * Create the draft (EPIC-E §3 step 1).
   *
   * Writes a `posts` row of `type = case_discussion, status = draft` plus its 1:1
   * `case_details`. Nothing about this is visible to anyone but the author until attest.
   */
  async createDraft(handleId: string, dto: CreateCaseDto): Promise<Thread> {
    await this.assertCategory(dto.categoryId);
    const tagIds = dto.tagIds ?? [];
    await this.assertTags(tagIds);

    const fields = trimFields(dto);
    const postId = await this.db.transaction(async (tx) => {
      const [row] = await tx
        .insert(posts)
        .values({
          handleId,
          categoryId: dto.categoryId,
          type: 'case_discussion',
          status: 'draft',
          title: derivedTitle(fields),
          body: derivedBody(fields),
        })
        .returning({ id: posts.id });

      await tx.insert(caseDetails).values({ postId: row.id, ...fields });
      if (tagIds.length > 0) {
        await tx.insert(postTags).values(tagIds.map((tagId) => ({ postId: row.id, tagId })));
      }
      return row.id;
    });

    return this.postsService.getThread(postId, handleId);
  }

  /**
   * Edit a draft (EPIC-E §3 step 2), or a published case sent back for correction.
   *
   * Editing a `needs_correction` case **clears its checklist** — see `assertEditable`. A
   * correction changes the clinical text, so the confirmations made about the previous
   * text no longer describe what is there, and carrying them forward would let a member
   * re-publish altered content on the strength of a tick applied to something else.
   */
  async updateDraft(postId: string, handleId: string, dto: UpdateCaseDto): Promise<Thread> {
    const current = await this.loadEditable(postId, handleId);
    if (dto.categoryId) await this.assertCategory(dto.categoryId);
    if (dto.tagIds) await this.assertTags(dto.tagIds);

    const fields = trimFields({ ...current.fields, ...stripUndefined(dto) });

    await this.db.transaction(async (tx) => {
      await tx
        .update(caseDetails)
        .set({ ...fields, checklistState: {} })
        .where(eq(caseDetails.postId, postId));

      await tx
        .update(posts)
        .set({
          categoryId: dto.categoryId ?? current.categoryId,
          title: derivedTitle(fields),
          body: derivedBody(fields),
          editedAt: new Date(),
        })
        .where(eq(posts.id, postId));

      if (dto.tagIds) {
        await tx.delete(postTags).where(eq(postTags.postId, postId));
        if (dto.tagIds.length > 0) {
          await tx.insert(postTags).values(dto.tagIds.map((tagId) => ({ postId, tagId })));
        }
      }
    });

    return this.postsService.getThread(postId, handleId);
  }

  /**
   * Record the checklist (EPIC-E §3 step 3).
   *
   * Whole-state replace, validated against the live item list: an unknown key is a client
   * that has drifted from the policy, and silently dropping it would leave the member
   * looking at a ticked box the server never recorded.
   */
  async setChecklist(
    postId: string,
    handleId: string,
    dto: SetChecklistDto,
  ): Promise<{ items: { key: string; label: string; confirmed: boolean }[]; complete: boolean }> {
    await this.loadEditable(postId, handleId);

    const known = new Set(CHECKLIST_ITEMS.map((i) => i.key));
    const unknown = Object.keys(dto.items).filter((k) => !known.has(k));
    if (unknown.length > 0) {
      throw new BadRequestException(`Unknown checklist item(s): ${unknown.join(', ')}.`);
    }

    // Normalised to exactly the live keys, so a stale client can't leave a retired item
    // sitting in the stored state where a later policy change might resurrect it.
    const state: Record<string, boolean> = {};
    for (const item of CHECKLIST_ITEMS) state[item.key] = dto.items[item.key] === true;

    await this.db.update(caseDetails).set({ checklistState: state }).where(eq(caseDetails.postId, postId));

    const items = CHECKLIST_ITEMS.map((i) => ({ ...i, confirmed: state[i.key] }));
    return { items, complete: items.every((i) => i.confirmed) };
  }

  /**
   * Attest and publish (EPIC-E §3 step 4, §5) — the one irreversible step in the epic.
   *
   * Three things happen in a single transaction, and either all of them hold or none do:
   * the attestation is written to `identity.case_attestations` against the member's
   * **verified legal identity**, the checklist is snapshotted into it, and the post flips
   * to `published`. A published case with no attestation record would be exactly the
   * failure the audit trail exists to make impossible, so it must not be reachable through
   * a partial write.
   *
   * Every gate is re-checked here against the database rather than trusted from the
   * request — this method is the boundary, and the composer's disabled button is a
   * courtesy on the far side of it.
   */
  async attest(
    postId: string,
    member: { memberId: string; handleId: string },
    dto: AttestCaseDto,
    ipAddress: string | null,
  ): Promise<Thread> {
    const current = await this.loadEditable(postId, member.handleId);

    if (!dto.confirmed) {
      throw new BadRequestException('The attestation must be confirmed.');
    }
    // A stale composer would otherwise record wording the member never saw.
    if (dto.attestationText.trim() !== ATTESTATION_TEXT) {
      throw new BadRequestException(
        'The attestation wording has changed since this form was opened. Please reload and read it again.',
      );
    }

    const state = current.checklistState ?? {};
    const outstanding = CHECKLIST_ITEMS.filter((i) => state[i.key] !== true);
    if (outstanding.length > 0) {
      throw new BadRequestException(
        `The de-identification checklist is incomplete: ${outstanding.map((i) => i.label).join('; ')}.`,
      );
    }

    const snapshot = CHECKLIST_ITEMS.map((i) => ({
      key: i.key,
      label: i.label,
      confirmed: true,
    }));

    await this.db.transaction(async (tx) => {
      await tx.insert(caseAttestations).values({
        memberId: member.memberId,
        postId,
        attestationText: ATTESTATION_TEXT,
        checklistSnapshot: snapshot,
        ipAddress,
      });
      await tx.update(posts).set({ status: 'published' }).where(eq(posts.id, postId));
    });

    return this.postsService.getThread(postId, member.handleId);
  }

  /**
   * The author's own unfinished cases (screen D3's entry point, gap G-8/G-21).
   *
   * Scoped to the caller's handle with no override: an unattested draft is not visible to
   * anyone else, moderators included (EPIC-E §12 — resolved 2026-07-17, "no").
   */
  async listDrafts(handleId: string): Promise<{ drafts: DraftCard[] }> {
    const rows = await this.db
      .select({
        id: posts.id,
        title: posts.title,
        status: posts.status,
        createdAt: posts.createdAt,
        editedAt: posts.editedAt,
        categoryId: categories.id,
        categoryName: categories.name,
        ageBand: caseDetails.ageBand,
        onsetDays: caseDetails.onsetDays,
        checklistState: caseDetails.checklistState,
      })
      .from(posts)
      .innerJoin(caseDetails, eq(caseDetails.postId, posts.id))
      .innerJoin(categories, eq(posts.categoryId, categories.id))
      .where(and(eq(posts.handleId, handleId), inArray(posts.status, ['draft', 'needs_correction'])))
      .orderBy(desc(posts.createdAt));

    return {
      drafts: rows.map((row) => ({
        id: row.id,
        title: row.title,
        status: row.status as 'draft' | 'needs_correction',
        category: { id: row.categoryId, name: row.categoryName },
        ageBand: row.ageBand,
        onsetDays: row.onsetDays,
        checklistRemaining: CHECKLIST_ITEMS.filter((i) => row.checklistState?.[i.key] !== true).length,
        checklistTotal: CHECKLIST_ITEMS.length,
        createdAt: row.createdAt.toISOString(),
        editedAt: row.editedAt?.toISOString() ?? null,
      })),
    };
  }

  /**
   * Load a case the caller is allowed to edit, or refuse.
   *
   * `draft` and `needs_correction` are the only editable states. A *published* case is
   * deliberately not editable here (EPIC-E §8): its content is what was attested to, and
   * silently rewriting it would leave the attestation describing text that no longer
   * exists. Getting it back into an editable state is a moderator's `request_correction`,
   * which is S11f.
   */
  private async loadEditable(postId: string, handleId: string) {
    const [row] = await this.db
      .select({
        handleId: posts.handleId,
        status: posts.status,
        categoryId: posts.categoryId,
        ageBand: caseDetails.ageBand,
        onsetDays: caseDetails.onsetDays,
        presentingCondition: caseDetails.presentingCondition,
        historyPresentingCondition: caseDetails.historyPresentingCondition,
        objectiveFindings: caseDetails.objectiveFindings,
        communityQuestion: caseDetails.communityQuestion,
        checklistState: caseDetails.checklistState,
      })
      .from(posts)
      .innerJoin(caseDetails, eq(caseDetails.postId, posts.id))
      .where(eq(posts.id, postId));

    // 404 rather than 403 for someone else's draft: "this exists but you may not touch it"
    // is itself a disclosure about a post nobody but its author should know exists.
    if (!row || row.handleId !== handleId) throw new NotFoundException('No such case discussion.');

    if (row.status !== 'draft' && row.status !== 'needs_correction') {
      throw new ForbiddenException(
        'A published case discussion cannot be edited. Ask a moderator to send it back for correction.',
      );
    }

    return {
      categoryId: row.categoryId,
      checklistState: row.checklistState,
      fields: {
        ageBand: row.ageBand,
        onsetDays: row.onsetDays,
        presentingCondition: row.presentingCondition,
        historyPresentingCondition: row.historyPresentingCondition,
        objectiveFindings: row.objectiveFindings,
        communityQuestion: row.communityQuestion,
      } satisfies CaseFields,
    };
  }

  private async assertCategory(categoryId: string): Promise<void> {
    const [category] = await this.db
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.id, categoryId), isNull(categories.retiredAt)));
    if (!category) throw new BadRequestException('That category does not exist.');
  }

  private async assertTags(tagIds: string[]): Promise<void> {
    if (tagIds.length === 0) return;
    const found = await this.db
      .select({ id: tags.id })
      .from(tags)
      .where(and(inArray(tags.id, tagIds), isNull(tags.retiredAt)));
    if (found.length !== tagIds.length) throw new BadRequestException('One or more tags do not exist.');
  }
}

function trimFields(fields: CaseFields): CaseFields {
  return {
    ageBand: fields.ageBand,
    onsetDays: fields.onsetDays,
    presentingCondition: fields.presentingCondition.trim(),
    historyPresentingCondition: fields.historyPresentingCondition.trim(),
    objectiveFindings: fields.objectiveFindings.trim(),
    communityQuestion: fields.communityQuestion.trim(),
  };
}

/** `{ a: undefined }` from an absent optional would otherwise overwrite a stored value. */
function stripUndefined<T extends object>(dto: T): Partial<T> {
  return Object.fromEntries(Object.entries(dto).filter(([, v]) => v !== undefined)) as Partial<T>;
}

/**
 * The list-surface title for a case (`posts.title`).
 *
 * Andrew's six-field template has no title field, and adding one back would be inventing a
 * requirement the clinical review deliberately removed. So the title is derived from the
 * presenting condition — the field a clinician scanning a list is actually triaging on —
 * truncated at a word boundary. `posts.title` is a projection of `case_details`, rewritten
 * on every edit; the canonical text is always the structured row.
 */
function derivedTitle(fields: CaseFields): string {
  const source = fields.presentingCondition.replace(/\s+/g, ' ').trim();
  if (source.length <= DERIVED_TITLE_LENGTH) return source;
  const cut = source.slice(0, DERIVED_TITLE_LENGTH);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/**
 * The searchable projection (`posts.body`).
 *
 * EPIC-C's full-text index is a generated column over `posts.title`/`posts.body`, so
 * without this a case discussion would be invisible to search except by its title. The
 * labels are included so a search for "objective findings" behaves sensibly. Never
 * rendered — screen C4 reads `case_details` and lays the fields out properly.
 */
function derivedBody(fields: CaseFields): string {
  return TEMPLATE_FIELDS.map(([key, label]) => `${label}: ${fields[key]}`).join('\n\n');
}
