import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../db/db.module';
import { comments, posts } from '../db/schema';
import type { CreateCommentDto } from './forum.dto';

@Injectable()
export class CommentsService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

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
