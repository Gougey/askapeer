import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../db/db.module';
import { comments, follows, posts } from '../db/schema';
import { NotificationEvents } from '../notifications/notifications.queue';
import type { CreateCommentDto } from './forum.dto';

@Injectable()
export class CommentsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly events: NotificationEvents,
  ) {}

  /**
   * Post an answer, or a reply to one (EPIC-C §5, reply composer X3). A `parentCommentId`
   * makes it a nested reply; its absence makes it a top-level answer, which is what the
   * kudos ranking orders (EPIC-D §4).
   */
  async create(handleId: string, postId: string, dto: CreateCommentDto): Promise<{ id: string }> {
    const [post] = await this.db
      .select({ status: posts.status })
      .from(posts)
      .where(eq(posts.id, postId));
    // Only a live, public thread can be answered — a removed post takes its thread with
    // it, and a draft/needs_correction post isn't a thread anyone but its author can see.
    if (!post || post.status !== 'published') throw new NotFoundException('No such post.');

    if (dto.parentCommentId) {
      const [parent] = await this.db
        .select({ postId: comments.postId, status: comments.status })
        .from(comments)
        .where(eq(comments.id, dto.parentCommentId));
      // A reply must hang off a live comment on *this* post — not a removed one, and not
      // one borrowed from another thread.
      if (!parent || parent.status !== 'published' || parent.postId !== postId) {
        throw new BadRequestException('The comment being replied to does not exist on this post.');
      }
    }

    const [row] = await this.db
      .insert(comments)
      .values({
        postId,
        handleId,
        parentCommentId: dto.parentCommentId ?? null,
        body: dto.body.trim(),
      })
      .returning({ id: comments.id });

    /*
     * Answering subscribes you to the thread (S15 §4) — which is what closes the hole this
     * slice exists for: before it, answering a question told you nothing when *someone
     * else* answered it too, because recipient resolution only ever picked one member.
     *
     * `onConflictDoNothing` covers the ordinary case of answering the same thread twice,
     * and re-follows anyone who muted it and then chose to write in it again. That is the
     * deliberate simplification in §4: an unfollow is not remembered as a tombstone.
     */
    await this.db
      .insert(follows)
      .values({ followerHandleId: handleId, targetType: 'post', targetId: postId })
      .onConflictDoNothing();

    // Announce the event; who hears about it is EPIC-G's business, not this service's
    // (it resolves the post or parent-comment author itself). Enqueued after the insert
    // so the worker can always read the row it is told about.
    await this.events.replyPosted(row.id);
    return { id: row.id };
  }

  /**
   * Author self-delete — a soft delete (`status = removed`), the same mechanism a
   * moderator uses (EPIC-C §6), so a removed answer's own replies aren't orphaned. Unlike
   * a moderation removal, this does **not** claw back kudos (EPIC-D §7): tidying up a
   * good-faith answer isn't a policy event.
   */
  async remove(handleId: string, commentId: string): Promise<void> {
    const [comment] = await this.db
      .select({ handleId: comments.handleId, status: comments.status })
      .from(comments)
      .where(eq(comments.id, commentId));
    if (!comment || comment.status === 'removed') throw new NotFoundException('No such comment.');
    if (comment.handleId !== handleId) {
      throw new ForbiddenException('You can only delete your own comments.');
    }
    await this.db
      .update(comments)
      .set({ status: 'removed' })
      .where(and(eq(comments.id, commentId), eq(comments.handleId, handleId)));
  }
}
