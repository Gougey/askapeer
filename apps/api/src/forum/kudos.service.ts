import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../db/db.module';
import { comments, handles, kudos, posts, type KudosKind } from '../db/schema';
import { NotificationEvents } from '../notifications/notifications.queue';

export type KudosTarget = 'post' | 'comment';
/** A target's kudos after an award or a retraction: both kinds' counts, and which the caller holds. */
export type KudosResult = {
  insightfulCount: number;
  usefulCount: number;
  hasInsightful: boolean;
  hasUseful: boolean;
};

/** The handle column each kind of kudos accrues to. */
const TOTAL = { insightful: handles.insightfulTotal, useful: handles.usefulTotal } as const;
const TOTAL_KEY = { insightful: 'insightfulTotal', useful: 'usefulTotal' } as const;

/** The target's author handle and whether it's live enough to receive kudos. */
type TargetRef = { authorHandleId: string; published: boolean } | undefined;

@Injectable()
export class KudosService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly events: NotificationEvents,
  ) {}

  /**
   * Award kudos to a post or comment (EPIC-D §3).
   *
   * Idempotent by design: a second award of the same target by the same handle is a
   * silent no-op returning the current count, not a 409 — "I want my kudos on this" is
   * already true, so a repeat tap isn't an error to surface (§3, resolved 2026-07-17).
   */
  async award(
    viewerHandleId: string,
    target: KudosTarget,
    targetId: string,
    kind: KudosKind,
  ): Promise<KudosResult> {
    const ref = await this.resolveTarget(target, targetId);
    // Not published (removed/draft) or absent: 404, the same answer the thread read gives.
    if (!ref?.published) throw new NotFoundException(`No such ${target}.`);
    // Self-kudos would let a member manufacture their own reputation — the one number a
    // peer can see about a handle — so it's rejected (§3).
    if (ref.authorHandleId === viewerHandleId) {
      throw new ForbiddenException('You cannot award kudos to your own contribution.');
    }

    // The insert and the author's total move together: the unique index turns a racing
    // double-award into a single insert, so the increment stays a blind `+ 1` that can't
    // lose a concurrent write (§2, §8). A no-op insert must not increment.
    const newTotal = await this.db.transaction(async (tx) => {
      const inserted = await tx
        .insert(kudos)
        .values({ targetType: target, targetId, givenByHandleId: viewerHandleId, kind })
        .onConflictDoNothing()
        .returning({ id: kudos.id });
      if (inserted.length === 0) return undefined; // already awarded — nothing changed
      const [row] = await tx
        .update(handles)
        .set({ [TOTAL_KEY[kind]]: sql`${TOTAL[kind]} + 1` })
        .where(eq(handles.id, ref.authorHandleId))
        .returning({ kudosTotal: handles.kudosTotal });
      return row.kudosTotal;
    });

    if (newTotal !== undefined) {
      // `newTotal` is undefined exactly when the insert was a no-op — the repeat tap EPIC-D
      // §3 makes silent. A repeat tap that notified would turn an idempotent action into a
      // way to badger someone.
      await this.events.kudosAwarded(target, targetId, viewerHandleId, kind);
    }
    return this.stateFor(target, targetId, viewerHandleId);
  }

  /**
   * Retract a kudos (§3 — kudos is presented as a live, editable action). A retract of a
   * kudos that isn't there is a no-op. The total is floored at zero so a double-retract,
   * or a clawback race, can never drive a handle's reputation negative.
   */
  async retract(
    viewerHandleId: string,
    target: KudosTarget,
    targetId: string,
    kind: KudosKind,
  ): Promise<KudosResult> {
    const ref = await this.resolveTarget(target, targetId);
    if (!ref) throw new NotFoundException(`No such ${target}.`);

    await this.db.transaction(async (tx) => {
      const deleted = await tx
        .delete(kudos)
        .where(
          and(
            eq(kudos.targetType, target),
            eq(kudos.targetId, targetId),
            eq(kudos.givenByHandleId, viewerHandleId),
            eq(kudos.kind, kind),
          ),
        )
        .returning({ id: kudos.id });
      if (deleted.length === 0) return;
      await tx
        .update(handles)
        .set({ [TOTAL_KEY[kind]]: sql`greatest(${TOTAL[kind]} - 1, 0)` })
        .where(eq(handles.id, ref.authorHandleId));
    });

    return this.stateFor(target, targetId, viewerHandleId);
  }

  private async resolveTarget(target: KudosTarget, targetId: string): Promise<TargetRef> {
    if (target === 'post') {
      const [row] = await this.db
        .select({ handleId: posts.handleId, status: posts.status })
        .from(posts)
        .where(eq(posts.id, targetId));
      return row ? { authorHandleId: row.handleId, published: row.status === 'published' } : undefined;
    }
    const [row] = await this.db
      .select({ handleId: comments.handleId, status: comments.status })
      .from(comments)
      .where(eq(comments.id, targetId));
    return row ? { authorHandleId: row.handleId, published: row.status === 'published' } : undefined;
  }

  /** Both kinds' counts for a target, and which the caller holds — one indexed read. */
  private async stateFor(
    target: KudosTarget,
    targetId: string,
    viewerHandleId: string,
  ): Promise<KudosResult> {
    const [row] = await this.db
      .select({
        insightful: sql<number>`count(*) filter (where ${kudos.kind} = 'insightful')::int`,
        useful: sql<number>`count(*) filter (where ${kudos.kind} = 'useful')::int`,
        mineInsightful: sql<boolean>`coalesce(bool_or(${kudos.kind} = 'insightful' and ${kudos.givenByHandleId} = ${viewerHandleId}), false)`,
        mineUseful: sql<boolean>`coalesce(bool_or(${kudos.kind} = 'useful' and ${kudos.givenByHandleId} = ${viewerHandleId}), false)`,
      })
      .from(kudos)
      .where(and(eq(kudos.targetType, target), eq(kudos.targetId, targetId)));
    return {
      insightfulCount: Number(row?.insightful ?? 0),
      usefulCount: Number(row?.useful ?? 0),
      hasInsightful: Boolean(row?.mineInsightful),
      hasUseful: Boolean(row?.mineUseful),
    };
  }

}
