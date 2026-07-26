import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../db/db.module';
import { comments, handles, kudos, moderationActions, posts, reports } from '../db/schema';
import { BadgeService } from '../forum/badge.service';
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

    if (dto.action === 'dismiss') {
      await this.db.update(reports).set({ status: 'dismissed' }).where(eq(reports.id, reportId));
      return { ok: true };
    }

    if (dto.action === 'remove_content') {
      if (report.targetType === 'handle') {
        throw new BadRequestException('remove_content applies to a post or comment, not a handle.');
      }
      const clawed = await this.removeContent(report, moderatorId, dto.reason);
      // Leaderboard mirrors the authoritative total, outside the DB transaction (EPIC-D §6).
      if (clawed) await this.badge.setScore(clawed.handleId, clawed.total);
      return { ok: true };
    }

    // warn — a logged formal warning against the handle, content untouched.
    const targetHandleId = await this.targetHandleFor(report);
    if (!targetHandleId) throw new NotFoundException(`No such ${report.targetType}.`);
    await this.db.transaction(async (tx) => {
      await tx.insert(moderationActions).values({
        reportId,
        targetHandleId,
        actionType: 'warn',
        moderatorId,
        reason: dto.reason?.trim() || null,
      });
      await tx.update(reports).set({ status: 'actioned' }).where(eq(reports.id, reportId));
    });
    return { ok: true };
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
  ): Promise<{ handleId: string; total: number } | null> {
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

      await tx.insert(moderationActions).values({
        reportId: report.id,
        targetHandleId: content.handleId,
        actionType: 'remove_content',
        moderatorId,
        reason: reason?.trim() || null,
      });
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
      return clawed;
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
        handleId: handles.id,
        handleName: handles.handleName,
      })
      .from(posts)
      .innerJoin(handles, eq(posts.handleId, handles.id))
      .where(inArray(posts.id, ids));
    return new Map(
      rows.map((r) => [
        r.id,
        { handleId: r.handleId, handleName: r.handleName, snippet: r.title, contentStatus: r.status, exists: true },
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
        { handleId: r.handleId, handleName: r.handleName, snippet: excerpt(r.body), contentStatus: r.status, exists: true },
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
        { handleId: r.id, handleName: r.name, snippet: r.name, contentStatus: null, exists: true },
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
  exists: false,
};

/** A one-line excerpt of member prose for the queue — enough to recognise, not the essay. */
function excerpt(body: string, max = 140): string {
  const oneLine = body.replace(/\s+/g, ' ').trim();
  return oneLine.length > max ? `${oneLine.slice(0, max)}…` : oneLine;
}
