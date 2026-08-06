import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, lt, or, sql } from 'drizzle-orm';
import { encodeCursor, decodeCursor } from '../common/cursor';
import { DRIZZLE, type Database } from '../db/db.module';
import { comments, follows, posts } from '../db/schema';
import type { ListPostsDto } from './forum.dto';
import { PostsService, type PostCard } from './posts.service';

const DEFAULT_PAGE_SIZE = 20;

export type FollowedPostList = { posts: PostCard[]; nextCursor: string | null };

/**
 * Following a discussion (S15) — EPIC-B §8's write path, narrowed to `target_type = post`.
 *
 * **A follow row is the thread's one subscription record.** Both notification types consult
 * it: `thread_activity` for ambient replies, and `reply` for a direct one. That is what
 * makes unfollow a real mute rather than half of one — silencing the ambient notifications
 * while direct replies kept arriving would make the control a lie.
 *
 * Auto-following on authoring is *not* here: it belongs with the insert that creates the
 * authorship, inside the same transaction (see `PostsService.create` and
 * `CommentsService.create`). This service owns the explicit, member-driven half.
 */
@Injectable()
export class FollowsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly postsService: PostsService,
  ) {}

  /**
   * Follow a discussion. Idempotent — a double tap is not an error.
   *
   * A post the caller cannot see 404s through the same visibility rules the thread read
   * uses (removed, or an author-private draft). Following something you cannot open must
   * not become a way to learn that it exists.
   */
  async followPost(handleId: string, postId: string): Promise<void> {
    const [post] = await this.db
      .select({ status: posts.status, handleId: posts.handleId })
      .from(posts)
      .where(eq(posts.id, postId));
    const authorPrivate = post?.status === 'draft' || post?.status === 'needs_correction';
    if (!post || post.status === 'removed' || (authorPrivate && post.handleId !== handleId)) {
      throw new NotFoundException('No such post.');
    }

    await this.db
      .insert(follows)
      .values({ followerHandleId: handleId, targetType: 'post', targetId: postId })
      .onConflictDoNothing();
  }

  /**
   * Unfollow — a full mute of the thread, direct replies included (§5).
   *
   * Deliberately **not** a 404 when no row exists: the member asked for silence and silence
   * is what they have. Reporting "you were not following that" is noise about a state they
   * were trying to reach anyway.
   */
  async unfollowPost(handleId: string, postId: string): Promise<void> {
    await this.db
      .delete(follows)
      .where(
        and(
          eq(follows.followerHandleId, handleId),
          eq(follows.targetType, 'post'),
          eq(follows.targetId, postId),
        ),
      );
  }

  /**
   * Activity › Following (screen E3) — discussions the caller follows but **did not write
   * in**.
   *
   * The exclusion is the §8.1 split, and it lives here rather than in the client so the two
   * panes cannot drift: authoring auto-follows, so without it every thread in My Q&A would
   * also be listed here, Following would fill with the member's own content, and the two
   * would stop answering different questions.
   *
   * Paginated on the **follow's** `created_at`, not the post's: this is a list of
   * subscriptions in the order they were taken on, which no ordering of `posts` expresses.
   * The ids are resolved to cards by `PostsService`, so the card DTO stays one shape
   * everywhere (EPIC-C §13.2).
   */
  async listFollowedPosts(handleId: string, query: ListPostsDto): Promise<FollowedPostList> {
    const limit = query.limit ?? DEFAULT_PAGE_SIZE;
    const cursor = decodeCursor(query.cursor);

    const rows = await this.db
      .select({ targetId: follows.targetId, createdAt: follows.createdAt })
      .from(follows)
      .innerJoin(posts, eq(posts.id, follows.targetId))
      .where(
        and(
          eq(follows.followerHandleId, handleId),
          eq(follows.targetType, 'post'),
          // A followed thread that has been removed, or sent back to its author for
          // correction, drops out rather than appearing as a row that 404s when tapped.
          eq(posts.status, 'published'),
          // §8.1 — mine, not watched. A post I wrote, or one I answered.
          sql`${posts.handleId} <> ${handleId}`,
          sql`not exists (
            select 1 from ${comments}
             where ${comments.postId} = ${follows.targetId}
               and ${comments.handleId} = ${handleId}
          )`,
          cursor
            ? or(
                lt(follows.createdAt, cursor.createdAt),
                and(eq(follows.createdAt, cursor.createdAt), lt(follows.targetId, cursor.id)),
              )
            : undefined,
        ),
      )
      .orderBy(desc(follows.createdAt), desc(follows.targetId))
      // One extra row answers "is there another page?" without a second count query.
      .limit(limit + 1);

    const page = rows.slice(0, limit);
    const last = page.at(-1);

    return {
      posts: await this.postsService.cardsByIds(page.map((r) => r.targetId)),
      nextCursor:
        rows.length > limit && last ? encodeCursor(last.createdAt, last.targetId) : null,
    };
  }
}
