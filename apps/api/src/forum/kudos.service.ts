import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../db/db.module';
import { comments, handles, kudos, posts } from '../db/schema';
import { BadgeService } from './badge.service';

export type KudosTarget = 'post' | 'comment';
export type KudosResult = { kudosCount: number; hasKudosed: boolean };

/** The target's author handle and whether it's live enough to receive kudos. */
type TargetRef = { authorHandleId: string; published: boolean } | undefined;

@Injectable()
export class KudosService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly badge: BadgeService,
  ) {}

  /**
   * Award kudos to a post or comment (EPIC-D §3).
   *
   * Idempotent by design: a second award of the same target by the same handle is a
   * silent no-op returning the current count, not a 409 — "I want my kudos on this" is
   * already true, so a repeat tap isn't an error to surface (§3, resolved 2026-07-17).
   */
  async award(viewerHandleId: string, target: KudosTarget, targetId: string): Promise<KudosResult> {
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
        .values({ targetType: target, targetId, givenByHandleId: viewerHandleId })
        .onConflictDoNothing()
        .returning({ id: kudos.id });
      if (inserted.length === 0) return undefined; // already awarded — nothing changed
      const [row] = await tx
        .update(handles)
        .set({ kudosTotal: sql`${handles.kudosTotal} + 1` })
        .where(eq(handles.id, ref.authorHandleId))
        .returning({ kudosTotal: handles.kudosTotal });
      return row.kudosTotal;
    });

    // Leaderboard mirrors the authoritative total, outside the DB transaction (§6).
    if (newTotal !== undefined) await this.badge.setScore(ref.authorHandleId, newTotal);
    return { kudosCount: await this.countFor(target, targetId), hasKudosed: true };
  }

  /**
   * Retract a kudos (§3 — kudos is presented as a live, editable action). A retract of a
   * kudos that isn't there is a no-op. The total is floored at zero so a double-retract,
   * or a clawback race, can never drive a handle's reputation negative.
   */
  async retract(viewerHandleId: string, target: KudosTarget, targetId: string): Promise<KudosResult> {
    const ref = await this.resolveTarget(target, targetId);
    if (!ref) throw new NotFoundException(`No such ${target}.`);

    const newTotal = await this.db.transaction(async (tx) => {
      const deleted = await tx
        .delete(kudos)
        .where(
          and(
            eq(kudos.targetType, target),
            eq(kudos.targetId, targetId),
            eq(kudos.givenByHandleId, viewerHandleId),
          ),
        )
        .returning({ id: kudos.id });
      if (deleted.length === 0) return undefined;
      const [row] = await tx
        .update(handles)
        .set({ kudosTotal: sql`greatest(${handles.kudosTotal} - 1, 0)` })
        .where(eq(handles.id, ref.authorHandleId))
        .returning({ kudosTotal: handles.kudosTotal });
      return row.kudosTotal;
    });

    if (newTotal !== undefined) await this.badge.setScore(ref.authorHandleId, newTotal);
    return { kudosCount: await this.countFor(target, targetId), hasKudosed: false };
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

  private async countFor(target: KudosTarget, targetId: string): Promise<number> {
    const [row] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(kudos)
      .where(and(eq(kudos.targetType, target), eq(kudos.targetId, targetId)));
    return row?.count ?? 0;
  }
}
