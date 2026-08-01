import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../db/db.module';
import {
  caseDetails,
  comments,
  handleBlocklist,
  handleNameHistory,
  handles,
  kudos,
  moderationActions,
  posts,
  refreshTokens,
  reports,
} from '../db/schema';
import { isUniqueViolation } from '../db/pg-errors';
import { NotificationEvents } from '../notifications/notifications.queue';
import { BadgeService } from '../forum/badge.service';
import { findBlocklistMatch, isValidFormat } from '../handles/handle-name';
import { VerificationService } from '../verification/verification.service';
import type { ModerationActionDto } from './moderation.dto';

type ReportRow = typeof reports.$inferSelect;

/**
 * The target of a report, resolved to what a moderator needs to triage it — all
 * pseudonymous (handle names are public; the queue never touches real identity, that's the
 * separately-audited reveal in S11e). `handleId` is the handle an action would land on:
 * the content's author, or the reported handle itself.
 */
export type ReportTargetContext = {
  handleId: string | null;
  handleName: string | null;
  snippet: string;
  /** post/comment status (e.g. already `removed`); null for a handle target. */
  contentStatus: string | null;
  /**
   * `question` | `case_discussion` for a post target; null otherwise. The queue needs it
   * because `request_correction` applies only to case discussions (S11f) — offering it on
   * a question would put the post in a state its author has no composer to leave.
   */
  contentType: string | null;
  exists: boolean;
};

export type ReportQueueItem = {
  id: string;
  targetType: ReportRow['targetType'];
  targetId: string;
  category: string;
  priority: boolean;
  status: string;
  comment: string | null;
  createdAt: string;
  reporterHandle: string | null;
  target: ReportTargetContext;
};

@Injectable()
export class ModerationService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly badge: BadgeService,
    private readonly verification: VerificationService,
    private readonly events: NotificationEvents,
  ) {}

  /**
   * The moderation queue (EPIC-F §4), priority tier first then oldest-first, each report
   * resolved to its target context. Defaults to `open`; a status filter lets the console
   * show actioned/dismissed history too.
   */
  async queue(status = 'open'): Promise<ReportQueueItem[]> {
    const rows = await this.db
      .select()
      .from(reports)
      .where(status === 'all' ? undefined : eq(reports.status, status as ReportRow['status']))
      .orderBy(desc(reports.priority), asc(reports.createdAt))
      .limit(200);
    return this.decorate(rows);
  }

  async getReport(reportId: string): Promise<ReportQueueItem> {
    const [row] = await this.db.select().from(reports).where(eq(reports.id, reportId));
    if (!row) throw new NotFoundException('No such report.');
    const [item] = await this.decorate([row]);
    return item;
  }

  /**
   * Take a moderation decision on a report (EPIC-F §3, §6). `remove_content` soft-removes
   * the post/comment and claws back the kudos it earned; `warn` records a formal warning;
   * `dismiss` closes a baseless report. Every non-dismiss action writes exactly one
   * immutable `moderation_actions` row, and the report is resolved in the same transaction.
   *
   * The target handle is derived from the report server-side, never trusted from the
   * caller — a moderator can't mis-target an action onto an unrelated handle.
   */
  async act(reportId: string, moderatorId: string, dto: ModerationActionDto): Promise<{ ok: true }> {
    const [report] = await this.db.select().from(reports).where(eq(reports.id, reportId));
    if (!report) throw new NotFoundException('No such report.');
    if (report.status !== 'open') throw new BadRequestException('This report is already resolved.');

    switch (dto.action) {
      case 'dismiss':
        await this.db.update(reports).set({ status: 'dismissed' }).where(eq(reports.id, reportId));
        return { ok: true };
      case 'remove_content': {
        if (report.targetType === 'handle') {
          throw new BadRequestException('remove_content applies to a post or comment, not a handle.');
        }
        const { authorHandleId, actionId, clawed } = await this.removeContent(
          report,
          moderatorId,
          dto.reason,
        );
        // Leaderboard mirrors the authoritative total, outside the DB transaction (EPIC-D §6).
        if (clawed) await this.badge.setScore(clawed.handleId, clawed.total);
        // Removal is the one action whose effect a member could otherwise only discover by
        // noticing their own post had vanished — and any kudos it earned went with it.
        await this.events.accountNotice(
          authorHandleId,
          { event: 'content_removed', reason: dto.reason?.trim() || null, actionId },
          actionId,
        );
        return { ok: true };
      }
      case 'warn':
        return this.warn(report, moderatorId, dto.reason);
      case 'suspend':
        return this.suspend(report, moderatorId, dto.reason);
      case 'expel':
        return this.expel(report, moderatorId, dto.reason);
      case 'rename_handle':
        return this.renameHandle(report, moderatorId, dto.reason, dto.newHandleName);
      case 'request_correction':
        return this.requestCorrection(report, moderatorId, dto.reason);
    }
  }

  /**
   * Send a published case discussion back to its author to fix (EPIC-F §3, EPIC-E §8).
   *
   * The middle path between removing a case and letting a de-identification slip stand:
   * the thread goes to `needs_correction`, which hides it from everyone but its author
   * (EPIC-C §13.4's read rule, inherited — nothing extra is needed here to hide it), the
   * author edits and re-attests, and it republishes with its discussion intact.
   *
   * **Kudos are not clawed back, and that is the whole point of this being a separate
   * action.** `remove_content` reverses reputation because the contribution should not
   * have existed; a correction says the opposite — the case is worth having, it just needs
   * fixing. The answers underneath it were given in good faith and are usually untouched
   * by whatever is wrong with the case, so penalising the people who wrote them would
   * punish the wrong members entirely. Nothing in this method touches `kudos` or
   * `handles.kudos_total`, and nothing should be added that does.
   *
   * Restricted to published case discussions: a question has no attestation to re-make and
   * no correction loop to re-enter, so sending one here would strand it in a state its
   * author has no composer to leave.
   */
  private async requestCorrection(
    report: ReportRow,
    moderatorId: string,
    reason?: string,
  ): Promise<{ ok: true }> {
    if (report.targetType !== 'post') {
      throw new BadRequestException(
        'request_correction applies to a case discussion, not a comment or handle.',
      );
    }

    const { authorHandleId, actionId } = await this.db.transaction(async (tx) => {
      const [post] = await tx
        .select({ handleId: posts.handleId, type: posts.type, status: posts.status })
        .from(posts)
        .where(eq(posts.id, report.targetId));
      if (!post) throw new NotFoundException('No such post.');

      if (post.type !== 'case_discussion') {
        throw new BadRequestException(
          'Only a case discussion can be sent back for correction. Use remove_content for a question.',
        );
      }
      if (post.status !== 'published') {
        // Already corrected, already removed, or still a draft — all cases where the
        // moderator is looking at stale queue state rather than at what is live.
        throw new ConflictException(`This case discussion is ${post.status}, not published.`);
      }

      await tx
        .update(posts)
        .set({ status: 'needs_correction' })
        .where(eq(posts.id, report.targetId));

      /*
       * Clear the stored checklist, so republishing requires confirming it again.
       *
       * Without this the author can re-attest the moment the notice arrives — unchanged
       * content, one API call, nothing re-confirmed — because `attest` gates on the
       * checklist state left over from the original publish, which is still complete. The
       * composer would not allow it, but the composer is not the gate; the server is
       * (EPIC-E §3 step 4), and that is the whole reason this epic is trustworthy.
       *
       * It is also the right semantics rather than just the safe ones: the state means
       * "what the author has confirmed about the text as it stands", and a moderator has
       * just said the text as it stands is wrong. Editing a draft clears it for exactly
       * the same reason (EPIC-E §8).
       */
      await tx
        .update(caseDetails)
        .set({ checklistState: {} })
        .where(eq(caseDetails.postId, report.targetId));

      const [action] = await tx
        .insert(moderationActions)
        .values({
          reportId: report.id,
          targetHandleId: post.handleId,
          actionType: 'request_correction',
          moderatorId,
          reason: reason?.trim() || null,
        })
        .returning({ id: moderationActions.id });

      // Siblings pointing at the same case resolve too — it is off public view, so every
      // open complaint about it has been addressed by this one action.
      await tx
        .update(reports)
        .set({ status: 'actioned' })
        .where(
          and(
            eq(reports.targetType, 'post'),
            eq(reports.targetId, report.targetId),
            eq(reports.status, 'open'),
          ),
        );

      return { authorHandleId: post.handleId, actionId: action.id };
    });

    // The one action that asks the member to *do* something, so the notice matters more
    // here than anywhere else: until they re-attest, their case stays hidden.
    await this.events.accountNotice(
      authorHandleId,
      { event: 'correction_requested', reason: reason?.trim() || null, actionId },
      actionId,
    );
    return { ok: true };
  }

  /** A logged formal warning against the offending handle; content and status untouched. */
  private async warn(report: ReportRow, moderatorId: string, reason?: string): Promise<{ ok: true }> {
    const owner = await this.handleAndOwner(report);
    if (!owner) throw new NotFoundException(`No such ${report.targetType}.`);
    const trimmed = reason?.trim() || null;
    const actionId = await this.db.transaction(async (tx) => {
      const [action] = await tx
        .insert(moderationActions)
        .values({
          reportId: report.id,
          targetHandleId: owner.handleId,
          actionType: 'warn',
          moderatorId,
          reason: trimmed,
        })
        .returning({ id: moderationActions.id });
      await tx.update(reports).set({ status: 'actioned' }).where(eq(reports.id, report.id));
      return action.id;
    });
    // A warning nobody is told about is not a warning. This is the action where the
    // in-app channel matters most: the member keeps their access, so they will see it.
    await this.events.accountNotice(
      owner.handleId,
      { event: 'warned', reason: trimmed, actionId },
      actionId,
    );
    return { ok: true };
  }

  /**
   * Suspend the offending handle (EPIC-F §3/§7). Sets `handles.status = suspended` only —
   * deliberately *not* the identity-side `verification_status`, which tracks a lapsed
   * registration, a different event resolved a different way (§7, resolved 2026-07-17).
   * Suspension is reversible and doesn't release the credential, so there's no
   * re-registration loophole to close. The member's refresh tokens are revoked so their
   * session can't outlive the current access token; on re-auth the handle-scope check
   * (AuthService.issueSession) sees `suspended` and routes them to the holding page.
   */
  private async suspend(report: ReportRow, moderatorId: string, reason?: string): Promise<{ ok: true }> {
    const owner = await this.handleAndOwner(report);
    if (!owner) throw new NotFoundException(`No such ${report.targetType}.`);
    const trimmed = reason?.trim() || null;
    const actionId = await this.db.transaction(async (tx) => {
      await tx.update(handles).set({ status: 'suspended' }).where(eq(handles.id, owner.handleId));
      const [action] = await tx
        .insert(moderationActions)
        .values({
          reportId: report.id,
          targetHandleId: owner.handleId,
          actionType: 'suspend',
          moderatorId,
          reason: trimmed,
        })
        .returning({ id: moderationActions.id });
      await tx.update(reports).set({ status: 'actioned' }).where(eq(reports.id, report.id));
      await tx.delete(refreshTokens).where(eq(refreshTokens.memberId, owner.memberId));
      return action.id;
    });
    // Suspension is why EPIC-G §6.1 locks this type's email on: the access gate now stops
    // this member at the holding page, so the inbox they cannot open is not a channel.
    // Before this, a suspended member was locked out with no explanation at all.
    await this.events.accountNotice(
      owner.handleId,
      { event: 'suspended', reason: trimmed, actionId },
      actionId,
    );
    return { ok: true };
  }

  /**
   * Expel the offending handle — permanent (EPIC-F §3/§7). Flips `handles.status =
   * expelled` **and** the identity-side `verification_status = expelled` in **one**
   * transaction, so the re-registration loophole is never left open by a crash between the
   * two writes: EPIC-A's uniqueness constraint blocks any non-`rejected` status from
   * re-registering, and a blocked attempt is logged to `reapplication_attempts` at
   * registration time. Refresh tokens are revoked; the status email fires after commit.
   */
  private async expel(report: ReportRow, moderatorId: string, reason?: string): Promise<{ ok: true }> {
    const owner = await this.handleAndOwner(report);
    if (!owner) throw new NotFoundException(`No such ${report.targetType}.`);
    const trimmed = reason?.trim() || null;
    const applied = await this.db.transaction(async (tx) => {
      await tx.update(handles).set({ status: 'expelled' }).where(eq(handles.id, owner.handleId));
      // Same transaction as the handle flip — the whole point of §7. Still routed through
      // the single writer of verification_status (VerificationService.applyTransition).
      const decision = await this.verification.applyTransition(
        tx,
        owner.memberId,
        'expelled',
        moderatorId,
        trimmed,
      );
      await tx.insert(moderationActions).values({
        reportId: report.id,
        targetHandleId: owner.handleId,
        actionType: 'expel',
        moderatorId,
        reason: trimmed,
      });
      await tx.update(reports).set({ status: 'actioned' }).where(eq(reports.id, report.id));
      await tx.delete(refreshTokens).where(eq(refreshTokens.memberId, owner.memberId));
      return decision;
    });
    // Routed through the notifier so the pre/post-handle split stays in one place. An
    // expelled member always has a handle, so this reaches EPIC-G's path — which, before
    // this change, dropped `expelled` on the floor and sent nothing at all.
    if (applied) {
      await this.verification.notifyStatusChanged(
        owner.memberId,
        'expelled',
        trimmed,
        applied.decisionId,
      );
    }
    return { ok: true };
  }

  /**
   * Force-rename the offending handle (EPIC-F §3, resolves EPIC-B §13) — when the name
   * itself is identifying or impersonating. The old name is recorded in
   * `handle_name_history`, which both keeps the handle's post history coherent and blocks
   * anyone re-adopting it. The new name is held to the same rules as a member-chosen one.
   */
  private async renameHandle(
    report: ReportRow,
    moderatorId: string,
    reason: string | undefined,
    newName: string | undefined,
  ): Promise<{ ok: true }> {
    if (!newName?.trim()) throw new BadRequestException('A new handle name is required.');
    const trimmedName = newName.trim();
    const owner = await this.handleAndOwner(report);
    if (!owner) throw new NotFoundException(`No such ${report.targetType}.`);
    await this.assertNameAvailable(trimmedName);

    let actionId = '';
    try {
      await this.db.transaction(async (tx) => {
        const [current] = await tx
          .select({ name: handles.handleName })
          .from(handles)
          .where(eq(handles.id, owner.handleId));
        await tx.update(handles).set({ handleName: trimmedName }).where(eq(handles.id, owner.handleId));
        await tx.insert(handleNameHistory).values({
          handleId: owner.handleId,
          previousName: current.name,
          changedBy: moderatorId,
        });
        const [action] = await tx
          .insert(moderationActions)
          .values({
            reportId: report.id,
            targetHandleId: owner.handleId,
            actionType: 'rename_handle',
            moderatorId,
            reason: reason?.trim() || null,
          })
          .returning({ id: moderationActions.id });
        await tx.update(reports).set({ status: 'actioned' }).where(eq(reports.id, report.id));
        actionId = action.id;
      });
    } catch (err) {
      // The case-insensitive unique index is the final arbiter against a racing claim.
      if (isUniqueViolation(err)) throw new ConflictException('That handle name is not available.');
      throw err;
    }
    // Their handle changed under them — the one moderation action a member could
    // otherwise discover only by noticing their own posts are signed by a stranger.
    await this.events.accountNotice(
      owner.handleId,
      { event: 'handle_renamed', newHandleName: trimmedName, reason: reason?.trim() || null, actionId },
      actionId,
    );
    return { ok: true };
  }

  /** Same availability rules as handle creation (EPIC-B §3) — format, blocklist, ever-used. */
  private async assertNameAvailable(name: string): Promise<void> {
    if (!isValidFormat(name)) {
      throw new BadRequestException('Handle must be 3–30 characters: letters, numbers, _ or -.');
    }
    const terms = await this.db
      .select({ term: handleBlocklist.term, matchMode: handleBlocklist.matchMode })
      .from(handleBlocklist);
    if (findBlocklistMatch(name, terms)) {
      throw new BadRequestException('That handle name is not allowed.');
    }
    const [live] = await this.db
      .select({ id: handles.id })
      .from(handles)
      .where(sql`lower(${handles.handleName}) = lower(${name})`);
    const [historic] = await this.db
      .select({ id: handleNameHistory.id })
      .from(handleNameHistory)
      .where(sql`lower(${handleNameHistory.previousName}) = lower(${name})`);
    if (live || historic) throw new ConflictException('That handle name is not available.');
  }

  /** The handle an action lands on, with its owning member id (for status + session revocation). */
  private async handleAndOwner(report: ReportRow): Promise<{ handleId: string; memberId: string } | null> {
    const handleId = await this.targetHandleFor(report);
    if (!handleId) return null;
    const [row] = await this.db
      .select({ memberId: handles.memberId })
      .from(handles)
      .where(eq(handles.id, handleId));
    return row ? { handleId, memberId: row.memberId } : null;
  }

  /**
   * Remove a reported post/comment and reverse the reputation it earned (EPIC-D §7).
   * Unlike an author self-delete, moderation removal claws back kudos: the rows are hard
   * deleted and the author's total is decremented by the same count in one transaction, so
   * the number can't drift. Sibling open reports on the same content resolve too — the
   * content is gone, so they're addressed.
   */
  private async removeContent(
    report: ReportRow,
    moderatorId: string,
    reason: string | undefined,
  ): Promise<{ authorHandleId: string; actionId: string; clawed: { handleId: string; total: number } | null }> {
    // Narrowed: `act` rejects a handle target before calling here, so this is post|comment
    // — which is exactly the `kudos.target_type` domain.
    const contentType: 'post' | 'comment' = report.targetType === 'post' ? 'post' : 'comment';
    const table = contentType === 'post' ? posts : comments;
    return this.db.transaction(async (tx) => {
      const [content] = await tx
        .select({ handleId: table.handleId, status: table.status })
        .from(table)
        .where(eq(table.id, report.targetId));
      if (!content) throw new NotFoundException(`No such ${report.targetType}.`);

      await tx.update(table).set({ status: 'removed' }).where(eq(table.id, report.targetId));

      const removed = await tx
        .delete(kudos)
        .where(and(eq(kudos.targetType, contentType), eq(kudos.targetId, report.targetId)))
        .returning({ id: kudos.id });
      let clawed: { handleId: string; total: number } | null = null;
      if (removed.length > 0) {
        const [row] = await tx
          .update(handles)
          .set({ kudosTotal: sql`greatest(${handles.kudosTotal} - ${removed.length}, 0)` })
          .where(eq(handles.id, content.handleId))
          .returning({ kudosTotal: handles.kudosTotal });
        clawed = { handleId: content.handleId, total: row.kudosTotal };
      }

      const [action] = await tx
        .insert(moderationActions)
        .values({
          reportId: report.id,
          targetHandleId: content.handleId,
          actionType: 'remove_content',
          moderatorId,
          reason: reason?.trim() || null,
        })
        .returning({ id: moderationActions.id });
      // Resolve this report and any siblings pointing at the now-removed content.
      await tx
        .update(reports)
        .set({ status: 'actioned' })
        .where(
          and(
            eq(reports.targetType, report.targetType),
            eq(reports.targetId, report.targetId),
            eq(reports.status, 'open'),
          ),
        );
      return { authorHandleId: content.handleId, actionId: action.id, clawed };
    });
  }

  /** The handle an action lands on: content author for a post/comment, else the handle. */
  private async targetHandleFor(report: ReportRow): Promise<string | null> {
    if (report.targetType === 'handle') {
      const [row] = await this.db
        .select({ id: handles.id })
        .from(handles)
        .where(eq(handles.id, report.targetId));
      return row?.id ?? null;
    }
    const table = report.targetType === 'post' ? posts : comments;
    const [row] = await this.db
      .select({ handleId: table.handleId })
      .from(table)
      .where(eq(table.id, report.targetId));
    return row?.handleId ?? null;
  }

  /** Resolve reporter names + target context for a page of reports, batched (no N+1). */
  private async decorate(rows: ReportRow[]): Promise<ReportQueueItem[]> {
    if (rows.length === 0) return [];
    const postIds = rows.filter((r) => r.targetType === 'post').map((r) => r.targetId);
    const commentIds = rows.filter((r) => r.targetType === 'comment').map((r) => r.targetId);
    const handleTargetIds = rows.filter((r) => r.targetType === 'handle').map((r) => r.targetId);

    const [postCtx, commentCtx, handleCtx, reporters] = await Promise.all([
      this.postContext(postIds),
      this.commentContext(commentIds),
      this.handleContext(handleTargetIds),
      this.handleNames(rows.map((r) => r.reporterHandleId)),
    ]);
    const ctxByType = { post: postCtx, comment: commentCtx, handle: handleCtx };

    return rows.map((r) => ({
      id: r.id,
      targetType: r.targetType,
      targetId: r.targetId,
      category: r.category,
      priority: r.priority ?? false,
      status: r.status,
      comment: r.comment,
      createdAt: r.createdAt.toISOString(),
      reporterHandle: reporters.get(r.reporterHandleId) ?? null,
      target: ctxByType[r.targetType].get(r.targetId) ?? MISSING_TARGET,
    }));
  }

  private async postContext(ids: string[]): Promise<Map<string, ReportTargetContext>> {
    if (ids.length === 0) return new Map();
    const rows = await this.db
      .select({
        id: posts.id,
        title: posts.title,
        status: posts.status,
        type: posts.type,
        handleId: handles.id,
        handleName: handles.handleName,
      })
      .from(posts)
      .innerJoin(handles, eq(posts.handleId, handles.id))
      .where(inArray(posts.id, ids));
    return new Map(
      rows.map((r) => [
        r.id,
        {
          handleId: r.handleId,
          handleName: r.handleName,
          snippet: r.title,
          contentStatus: r.status,
          contentType: r.type,
          exists: true,
        },
      ]),
    );
  }

  private async commentContext(ids: string[]): Promise<Map<string, ReportTargetContext>> {
    if (ids.length === 0) return new Map();
    const rows = await this.db
      .select({
        id: comments.id,
        body: comments.body,
        status: comments.status,
        handleId: handles.id,
        handleName: handles.handleName,
      })
      .from(comments)
      .innerJoin(handles, eq(comments.handleId, handles.id))
      .where(inArray(comments.id, ids));
    return new Map(
      rows.map((r) => [
        r.id,
        {
          handleId: r.handleId,
          handleName: r.handleName,
          snippet: excerpt(r.body),
          contentStatus: r.status,
          contentType: null,
          exists: true,
        },
      ]),
    );
  }

  private async handleContext(ids: string[]): Promise<Map<string, ReportTargetContext>> {
    if (ids.length === 0) return new Map();
    const rows = await this.db
      .select({ id: handles.id, name: handles.handleName, status: handles.status })
      .from(handles)
      .where(inArray(handles.id, ids));
    return new Map(
      rows.map((r) => [
        r.id,
        {
          handleId: r.id,
          handleName: r.name,
          snippet: r.name,
          contentStatus: null,
          contentType: null,
          exists: true,
        },
      ]),
    );
  }

  private async handleNames(ids: string[]): Promise<Map<string, string>> {
    const unique = [...new Set(ids)];
    if (unique.length === 0) return new Map();
    const rows = await this.db
      .select({ id: handles.id, name: handles.handleName })
      .from(handles)
      .where(inArray(handles.id, unique));
    return new Map(rows.map((r) => [r.id, r.name]));
  }
}

const MISSING_TARGET: ReportTargetContext = {
  handleId: null,
  handleName: null,
  snippet: '(deleted)',
  contentStatus: null,
  contentType: null,
  exists: false,
};

/** A one-line excerpt of member prose for the queue — enough to recognise, not the essay. */
function excerpt(body: string, max = 140): string {
  const oneLine = body.replace(/\s+/g, ' ').trim();
  return oneLine.length > max ? `${oneLine.slice(0, max)}…` : oneLine;
}
