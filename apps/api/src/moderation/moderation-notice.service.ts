import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../db/db.module';
import { comments, moderationActions, posts, reports } from '../db/schema';

/**
 * What the member sees. Every field here is a deliberate decision about disclosure —
 * see the service comment for what is left out and why.
 */
export type ModerationNotice = {
  action: { id: string; type: string; reason: string | null; createdAt: string };
  /** The complaint's category only. Null when a moderator acted without a report. */
  report: { category: string } | null;
  /** The member's own content that was acted on, if the report pointed at content. */
  content: {
    targetType: 'post' | 'comment';
    postId: string;
    postTitle: string;
    body: string;
    /** `question` | `case_discussion` for a post; null for a comment. The screen labels a
     *  case as a case rather than calling it "your question", and routes its fix CTA to
     *  the case composer. */
    postType: string | null;
    removed: boolean;
    /**
     * The case is hidden pending the author's own fix (`needs_correction`, S11f) — a
     * different thing from `removed`, and the distinction is the whole message: removed
     * content is gone and its kudos with it, a correction is waiting on them and comes
     * back intact. Kept separate from `removed` so the screen cannot accidentally tell a
     * member their work was deleted when it is sitting there waiting for an edit.
     */
    awaitingCorrection: boolean;
  } | null;
};

/**
 * The member-facing view of a moderation action taken against them (screen E4).
 *
 * **Not specified by EPIC-F**, which defines the actions and their immutable audit trail
 * but says nothing about what the actioned member is told — there is no notice screen or
 * appeal flow in that spec. This fills that gap: a warning with no context ("your account
 * status has changed") is not a warning, because the member cannot tell what they did or
 * change what they do next.
 *
 * Three things are deliberately withheld, and none of them are oversights:
 *
 * - **Who reported them.** `reports.reporter_handle_id` never leaves this service.
 *   Handing the reported member the reporter's handle invites retaliation, and the
 *   reporting flow's value depends on it being safe to use.
 * - **The reporter's own words.** `reports.comment` is free text and can identify its
 *   author by circumstance ("I saw this right after your talk on…") even when it names
 *   nobody. The member gets the *category*, which is the substance of the complaint
 *   without the fingerprint.
 * - **Which moderator acted.** `moderation_actions.moderator_id` is an identity-side
 *   member id — a real person, not a handle. It is for the audit trail, not the member.
 *
 * Scoped to the caller's own handle: an action belonging to someone else is a 404, not a
 * 403, the same rule the rest of the read layer follows.
 */
@Injectable()
export class ModerationNoticeService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async forHandle(actionId: string, handleId: string): Promise<ModerationNotice> {
    const [action] = await this.db
      .select({
        id: moderationActions.id,
        type: moderationActions.actionType,
        reason: moderationActions.reason,
        createdAt: moderationActions.createdAt,
        reportId: moderationActions.reportId,
      })
      .from(moderationActions)
      .where(
        and(eq(moderationActions.id, actionId), eq(moderationActions.targetHandleId, handleId)),
      );
    if (!action) throw new NotFoundException('No such notice.');

    let report: ModerationNotice['report'] = null;
    let content: ModerationNotice['content'] = null;

    if (action.reportId) {
      // Category only — never `reporter_handle_id`, never `comment`.
      const [row] = await this.db
        .select({
          category: reports.category,
          targetType: reports.targetType,
          targetId: reports.targetId,
        })
        .from(reports)
        .where(eq(reports.id, action.reportId));
      if (row) {
        report = { category: row.category };
        content = await this.contentFor(row.targetType, row.targetId, handleId);
      }
    }

    return {
      action: {
        id: action.id,
        type: action.type,
        reason: action.reason,
        createdAt: action.createdAt.toISOString(),
      },
      report,
      content,
    };
  }

  /**
   * The content the report pointed at — but only if it is the caller's own. A report
   * against a *handle* has no content, and a member who was actioned over one piece of
   * content has no claim to see another.
   *
   * Removed content is still returned to its author: they are entitled to know what was
   * taken down, and it is their own writing.
   */
  private async contentFor(
    targetType: string,
    targetId: string,
    handleId: string,
  ): Promise<ModerationNotice['content']> {
    if (targetType === 'post') {
      const [row] = await this.db
        .select({
          id: posts.id,
          title: posts.title,
          body: posts.body,
          status: posts.status,
          type: posts.type,
          handleId: posts.handleId,
        })
        .from(posts)
        .where(eq(posts.id, targetId));
      if (!row || row.handleId !== handleId) return null;
      return {
        targetType: 'post',
        postId: row.id,
        postTitle: row.title,
        body: row.body,
        postType: row.type,
        removed: row.status === 'removed',
        awaitingCorrection: row.status === 'needs_correction',
      };
    }
    if (targetType === 'comment') {
      const [row] = await this.db
        .select({
          body: comments.body,
          status: comments.status,
          handleId: comments.handleId,
          postId: posts.id,
          postTitle: posts.title,
        })
        .from(comments)
        .innerJoin(posts, eq(posts.id, comments.postId))
        .where(eq(comments.id, targetId));
      if (!row || row.handleId !== handleId) return null;
      return {
        targetType: 'comment',
        postId: row.postId,
        postTitle: row.postTitle,
        body: row.body,
        postType: null,
        removed: row.status === 'removed',
        // A comment is never sent back for correction — the action targets a case
        // discussion, which is always a post.
        awaitingCorrection: false,
      };
    }
    // target_type = handle: the action was about the member, not a piece of content.
    return null;
  }
}
