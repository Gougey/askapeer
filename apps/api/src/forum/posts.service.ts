import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, desc, eq, inArray, isNull, lt, or, sql } from 'drizzle-orm';
import { encodeCursor, decodeCursor } from '../common/cursor';
import { DRIZZLE, type Database } from '../db/db.module';
import { categories, comments, handles, kudos, postTags, posts, tags } from '../db/schema';
import { BadgeService } from './badge.service';
import type { CreatePostDto, ListPostsDto } from './forum.dto';

const DEFAULT_PAGE_SIZE = 20;
/** Enough of the body to judge whether a question is worth opening, not enough to replace it. */
const SNIPPET_LENGTH = 200;

/**
 * Peer-visible reputation, joined at read time from `community.handles` (EPIC-C §13.1,
 * gap G-4). Everything here is pseudonymous by construction — the join is to the handle
 * row, which has no path to a real identity.
 */
export type AuthorBlock = {
  handleId: string;
  handleName: string;
  kudosTotal: number;
  /** Top ~1% of active handles by kudos, above a floor (EPIC-D §6) — merit the community
   *  awarded, never rank or seniority. Computed from the Redis leaderboard at read time. */
  isTopContributor: boolean;
};

export type TagRef = { id: string; name: string };

/** The list/card DTO (EPIC-C §13.2, gap G-17). Shared by every list surface. */
export type PostCard = {
  id: string;
  type: 'question' | 'case_discussion';
  title: string;
  snippet: string;
  category: { id: string; name: string };
  tags: TagRef[];
  author: AuthorBlock;
  answerCount: number;
  kudosCount: number;
  createdAt: string;
  editedAt: string | null;
};

export type PostList = { posts: PostCard[]; nextCursor: string | null };

/**
 * One of the caller's own answers (Activity › My Q&A, screen E2, gap G-21).
 *
 * Not the shared card DTO: this list answers "what have I written, and how was it
 * received", so it carries the thread it belongs to rather than an author block — the
 * author is always the caller, and repeating their own handle on every row is noise.
 */
export type MyCommentCard = {
  id: string;
  snippet: string;
  kudosCount: number;
  createdAt: string;
  editedAt: string | null;
  /** Where it lives, so the row can link into the thread. */
  post: { id: string; title: string; type: 'question' | 'case_discussion' };
};

export type MyCommentList = { comments: MyCommentCard[]; nextCursor: string | null };

export type ThreadComment = {
  id: string;
  author: AuthorBlock;
  body: string;
  parentCommentId: string | null;
  kudosCount: number;
  /** Whether the calling handle has awarded kudos to this comment (EPIC-C §13.1, G-3). */
  hasKudosed: boolean;
  /** The caller authored this comment — drives the self-delete affordance and the fact
   *  that a handle can't kudos its own contribution, without a second round-trip. */
  isMine: boolean;
  createdAt: string;
  editedAt: string | null;
};

/** The thread DTO (EPIC-C §13.1). `viewerContext` is bundled so the client can render
 *  every control state in one round-trip rather than N follow-up calls. */
export type Thread = {
  post: Omit<PostCard, 'snippet'> & { body: string; status: string };
  comments: ThreadComment[];
  viewerContext: { isAuthor: boolean; hasKudosedPost: boolean };
};

/** A comment row plus its kudos figures, before ranking flattens it into the thread. */
type RankableComment = ThreadComment & { createdAtMs: number };

@Injectable()
export class PostsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly badge: BadgeService,
  ) {}

  /**
   * Compose a question (screens D1/D2). Case discussions are *not* creatable here — they
   * publish through EPIC-E's checklist-and-attestation route (S9), and the `type` column
   * is hardcoded to `question` rather than taken from the caller so this endpoint can
   * never become a way around that gate.
   */
  async create(handleId: string, dto: CreatePostDto): Promise<Thread> {
    const [category] = await this.db
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.id, dto.categoryId), isNull(categories.retiredAt)));
    if (!category) throw new BadRequestException('That category does not exist.');

    const tagIds = dto.tagIds ?? [];
    if (tagIds.length > 0) {
      // Select-only from the seeded vocabulary (FD-4): an unknown or retired id is a
      // client bug or a hand-rolled request, not a request to create a tag.
      const found = await this.db
        .select({ id: tags.id })
        .from(tags)
        .where(and(inArray(tags.id, tagIds), isNull(tags.retiredAt)));
      if (found.length !== tagIds.length) {
        throw new BadRequestException('One or more tags do not exist.');
      }
    }

    const postId = await this.db.transaction(async (tx) => {
      const [row] = await tx
        .insert(posts)
        .values({
          handleId,
          categoryId: dto.categoryId,
          type: 'question',
          title: dto.title.trim(),
          body: dto.body.trim(),
        })
        .returning({ id: posts.id });
      if (tagIds.length > 0) {
        await tx.insert(postTags).values(tagIds.map((tagId) => ({ postId: row.id, tagId })));
      }
      return row.id;
    });

    // Read back through the same path the thread screen uses, so the composer's success
    // response and a fresh page load are the same object.
    return this.getThread(postId, handleId);
  }

  /**
   * The Discussions list (screen C1), newest first. Keyset-paginated on `(created_at, id)`:
   * an offset would drift as new posts land at the head, silently repeating or skipping
   * rows for anyone reading page 2 of a live list.
   *
   * `authorHandleId` narrows it to one member's own questions — Activity › My Q&A
   * (screen E2, gap G-21). Deliberately the same query rather than a parallel one: EPIC-C
   * §13.2 makes the card DTO shared across every list surface, and two implementations
   * of it would drift the moment a card gains a field.
   *
   * Note that it stays `status = 'published'` either way. Drafts and `needs_correction`
   * are author-private but belong to `/v1/me/drafts` (EPIC-E, S9), which is a different
   * screen with a different job — this one is "what I've contributed", not "what I owe".
   */
  async list(query: ListPostsDto, authorHandleId?: string): Promise<PostList> {
    const limit = query.limit ?? DEFAULT_PAGE_SIZE;
    const cursor = decodeCursor(query.cursor);

    const rows = await this.db
      .select({
        id: posts.id,
        type: posts.type,
        title: posts.title,
        body: posts.body,
        createdAt: posts.createdAt,
        editedAt: posts.editedAt,
        categoryId: categories.id,
        categoryName: categories.name,
        handleId: handles.id,
        handleName: handles.handleName,
        kudosTotal: handles.kudosTotal,
        answerCount: answerCountSql,
        kudosCount: postKudosCountSql,
      })
      .from(posts)
      .innerJoin(handles, eq(posts.handleId, handles.id))
      .innerJoin(categories, eq(posts.categoryId, categories.id))
      .where(
        and(
          eq(posts.status, 'published'),
          authorHandleId ? eq(posts.handleId, authorHandleId) : undefined,
          query.category ? eq(posts.categoryId, query.category) : undefined,
          // A tag filter needs the join table; the semi-join keeps one row per post even
          // though a post can match on several tags.
          query.tag
            ? sql`exists (select 1 from ${postTags} where ${postTags.postId} = ${posts.id} and ${postTags.tagId} = ${query.tag})`
            : undefined,
          cursor
            ? or(
                lt(posts.createdAt, cursor.createdAt),
                and(eq(posts.createdAt, cursor.createdAt), lt(posts.id, cursor.id)),
              )
            : undefined,
        ),
      )
      .orderBy(desc(posts.createdAt), desc(posts.id))
      // One extra row answers "is there another page?" without a second count query.
      .limit(limit + 1);

    const page = rows.slice(0, limit);
    const [tagsByPost, badged] = await Promise.all([
      this.tagsFor(page.map((r) => r.id)),
      this.badge.qualifying(page.map((r) => r.handleId)),
    ]);
    const last = page.at(-1);

    return {
      posts: page.map((row) => ({
        id: row.id,
        type: row.type,
        title: row.title,
        snippet: snippet(row.body),
        category: { id: row.categoryId, name: row.categoryName },
        tags: tagsByPost.get(row.id) ?? [],
        author: authorBlock(row, badged),
        answerCount: Number(row.answerCount),
        kudosCount: Number(row.kudosCount),
        createdAt: row.createdAt.toISOString(),
        editedAt: row.editedAt?.toISOString() ?? null,
      })),
      nextCursor: rows.length > limit && last ? encodeCursor(last.createdAt, last.id) : null,
    };
  }

  /**
   * The caller's own answers, newest first (screen E2, gap G-21).
   *
   * A removed *post* takes its answers out of this list too: an answer to a thread that
   * no longer exists has nowhere to link and nothing to show, so the join is an inner
   * one on a published post rather than a left join with a placeholder.
   */
  async listMyComments(handleId: string, query: ListPostsDto): Promise<MyCommentList> {
    const limit = query.limit ?? DEFAULT_PAGE_SIZE;
    const cursor = decodeCursor(query.cursor);

    const rows = await this.db
      .select({
        id: comments.id,
        body: comments.body,
        createdAt: comments.createdAt,
        editedAt: comments.editedAt,
        postId: posts.id,
        postTitle: posts.title,
        postType: posts.type,
        kudosCount: commentKudosCountSql,
      })
      .from(comments)
      .innerJoin(posts, eq(posts.id, comments.postId))
      .where(
        and(
          eq(comments.handleId, handleId),
          eq(comments.status, 'published'),
          eq(posts.status, 'published'),
          cursor
            ? or(
                lt(comments.createdAt, cursor.createdAt),
                and(eq(comments.createdAt, cursor.createdAt), lt(comments.id, cursor.id)),
              )
            : undefined,
        ),
      )
      .orderBy(desc(comments.createdAt), desc(comments.id))
      .limit(limit + 1);

    const page = rows.slice(0, limit);
    const last = page.at(-1);
    return {
      comments: page.map((row) => ({
        id: row.id,
        snippet: snippet(row.body),
        kudosCount: Number(row.kudosCount),
        createdAt: row.createdAt.toISOString(),
        editedAt: row.editedAt?.toISOString() ?? null,
        post: { id: row.postId, title: row.postTitle, type: row.postType },
      })),
      nextCursor: rows.length > limit && last ? encodeCursor(last.createdAt, last.id) : null,
    };
  }

  /**
   * A single thread (screen C4).
   *
   * `draft` and `needs_correction` posts are returned **only to their author** (EPIC-C
   * §13.4, gap G-8) — to anyone else they 404 rather than 403, since "this exists but
   * you can't see it" is itself a disclosure. Nothing in S4/S5 creates those statuses,
   * but the rule lives at the read layer so EPIC-E (S9) inherits it.
   */
  async getThread(postId: string, viewerHandleId: string): Promise<Thread> {
    const [row] = await this.db
      .select({
        id: posts.id,
        type: posts.type,
        title: posts.title,
        body: posts.body,
        status: posts.status,
        createdAt: posts.createdAt,
        editedAt: posts.editedAt,
        categoryId: categories.id,
        categoryName: categories.name,
        handleId: handles.id,
        handleName: handles.handleName,
        kudosTotal: handles.kudosTotal,
        answerCount: answerCountSql,
        kudosCount: postKudosCountSql,
      })
      .from(posts)
      .innerJoin(handles, eq(posts.handleId, handles.id))
      .innerJoin(categories, eq(posts.categoryId, categories.id))
      .where(eq(posts.id, postId));

    if (!row) throw new NotFoundException('No such post.');
    const isAuthor = row.handleId === viewerHandleId;
    const authorPrivate = row.status === 'draft' || row.status === 'needs_correction';
    if (row.status === 'removed' || (authorPrivate && !isAuthor)) {
      throw new NotFoundException('No such post.');
    }

    const [tagsByPost, ranked, hasKudosedPost] = await Promise.all([
      this.tagsFor([row.id]),
      this.rankedComments(row.id, viewerHandleId),
      this.viewerKudosedPost(row.id, viewerHandleId),
    ]);

    // One badge lookup covers the post author and every commenter shown.
    const badged = await this.badge.qualifying([
      row.handleId,
      ...ranked.map((c) => c.author.handleId),
    ]);

    return {
      post: {
        id: row.id,
        type: row.type,
        title: row.title,
        body: row.body,
        status: row.status,
        category: { id: row.categoryId, name: row.categoryName },
        tags: tagsByPost.get(row.id) ?? [],
        author: authorBlock(row, badged),
        answerCount: Number(row.answerCount),
        kudosCount: Number(row.kudosCount),
        createdAt: row.createdAt.toISOString(),
        editedAt: row.editedAt?.toISOString() ?? null,
      },
      comments: ranked.map((c) => ({
        ...c,
        author: { ...c.author, isTopContributor: badged.has(c.author.handleId) },
      })),
      viewerContext: { isAuthor, hasKudosedPost },
    };
  }

  /**
   * Tags for a page of posts in one query, grouped in memory. Aggregating in SQL would
   * mean a json_agg per row; this stays two plain indexed reads.
   */
  private async tagsFor(postIds: string[]): Promise<Map<string, TagRef[]>> {
    const grouped = new Map<string, TagRef[]>();
    if (postIds.length === 0) return grouped;

    const rows = await this.db
      .select({ postId: postTags.postId, id: tags.id, name: tags.name })
      .from(postTags)
      .innerJoin(tags, eq(postTags.tagId, tags.id))
      .where(inArray(postTags.postId, postIds))
      .orderBy(asc(tags.sortOrder), asc(tags.name));

    for (const row of rows) {
      const list = grouped.get(row.postId) ?? [];
      list.push({ id: row.id, name: row.name });
      grouped.set(row.postId, list);
    }
    return grouped;
  }

  /**
   * The thread's answers, ranked (EPIC-D §4): top-level answers by kudos descending with
   * an earliest-first tiebreak, and each answer's nested replies chronologically beneath
   * it. Kudos ranks *answers*, not conversation — ranking replies would fragment a
   * genuine back-and-forth. Returned as a flat, display-ordered list; `parentCommentId`
   * lets the client indent.
   */
  private async rankedComments(postId: string, viewerHandleId: string): Promise<ThreadComment[]> {
    const rows = await this.db
      .select({
        id: comments.id,
        body: comments.body,
        parentCommentId: comments.parentCommentId,
        createdAt: comments.createdAt,
        editedAt: comments.editedAt,
        handleId: handles.id,
        handleName: handles.handleName,
        kudosTotal: handles.kudosTotal,
      })
      .from(comments)
      .innerJoin(handles, eq(comments.handleId, handles.id))
      .where(and(eq(comments.postId, postId), eq(comments.status, 'published')));

    if (rows.length === 0) return [];

    const counts = await this.commentKudos(
      rows.map((r) => r.id),
      viewerHandleId,
    );

    const enriched: RankableComment[] = rows.map((row) => ({
      id: row.id,
      author: authorBlock(row, EMPTY_BADGE_SET), // badge filled in by the caller
      body: row.body,
      parentCommentId: row.parentCommentId,
      kudosCount: counts.get(row.id)?.count ?? 0,
      hasKudosed: counts.get(row.id)?.hasKudosed ?? false,
      isMine: row.handleId === viewerHandleId,
      createdAt: row.createdAt.toISOString(),
      editedAt: row.editedAt?.toISOString() ?? null,
      createdAtMs: row.createdAt.getTime(),
    }));

    return rankAndFlatten(enriched);
  }

  /** Per-comment kudos count and whether the viewer awarded it, in two indexed reads. */
  private async commentKudos(
    commentIds: string[],
    viewerHandleId: string,
  ): Promise<Map<string, { count: number; hasKudosed: boolean }>> {
    const result = new Map<string, { count: number; hasKudosed: boolean }>();
    if (commentIds.length === 0) return result;

    const [counts, mine] = await Promise.all([
      this.db
        .select({ targetId: kudos.targetId, count: sql<number>`count(*)::int` })
        .from(kudos)
        .where(and(eq(kudos.targetType, 'comment'), inArray(kudos.targetId, commentIds)))
        .groupBy(kudos.targetId),
      this.db
        .select({ targetId: kudos.targetId })
        .from(kudos)
        .where(
          and(
            eq(kudos.targetType, 'comment'),
            inArray(kudos.targetId, commentIds),
            eq(kudos.givenByHandleId, viewerHandleId),
          ),
        ),
    ]);

    const mineSet = new Set(mine.map((r) => r.targetId));
    for (const id of commentIds) {
      result.set(id, { count: 0, hasKudosed: mineSet.has(id) });
    }
    for (const row of counts) {
      result.set(row.targetId, {
        count: Number(row.count),
        hasKudosed: mineSet.has(row.targetId),
      });
    }
    return result;
  }

  private async viewerKudosedPost(postId: string, viewerHandleId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: kudos.id })
      .from(kudos)
      .where(
        and(
          eq(kudos.targetType, 'post'),
          eq(kudos.targetId, postId),
          eq(kudos.givenByHandleId, viewerHandleId),
        ),
      );
    return row !== undefined;
  }
}

const EMPTY_BADGE_SET: ReadonlySet<string> = new Set();

/**
 * Top-level answers only (published). Nested replies are conversation, not answers, so
 * they don't inflate the count — the same distinction the kudos ranking draws (§4).
 */
const answerCountSql = sql<number>`(
  select count(*) from ${comments}
  where ${comments.postId} = ${posts.id}
    and ${comments.status} = 'published'
    and ${comments.parentCommentId} is null
)`;

const postKudosCountSql = sql<number>`(
  select count(*) from ${kudos}
  where ${kudos.targetType} = 'post' and ${kudos.targetId} = ${posts.id}
)`;

const commentKudosCountSql = sql<number>`(
  select count(*) from ${kudos}
  where ${kudos.targetType} = 'comment' and ${kudos.targetId} = ${comments.id}
)`;

/**
 * Ranks top-level answers by kudos (desc), earliest-first on ties, and slots each answer's
 * reply sub-tree chronologically beneath it. Depth-first so a reply always follows its
 * parent; the flat result is what the thread DTO returns.
 */
function rankAndFlatten(all: RankableComment[]): ThreadComment[] {
  const childrenOf = new Map<string | null, RankableComment[]>();
  for (const c of all) {
    const key = c.parentCommentId;
    childrenOf.set(key, [...(childrenOf.get(key) ?? []), c]);
  }

  const byKudosThenAge = (a: RankableComment, b: RankableComment) =>
    b.kudosCount - a.kudosCount || a.createdAtMs - b.createdAtMs;
  const byAge = (a: RankableComment, b: RankableComment) => a.createdAtMs - b.createdAtMs;

  const out: ThreadComment[] = [];
  const emit = (node: RankableComment) => {
    const { createdAtMs, ...comment } = node;
    out.push(comment);
    // Replies are conversation, not ranked answers — always chronological.
    for (const child of (childrenOf.get(node.id) ?? []).sort(byAge)) emit(child);
  };

  for (const root of (childrenOf.get(null) ?? []).sort(byKudosThenAge)) emit(root);
  return out;
}

function authorBlock(
  row: { handleId: string; handleName: string; kudosTotal: number },
  badged: ReadonlySet<string>,
): AuthorBlock {
  return {
    handleId: row.handleId,
    handleName: row.handleName,
    kudosTotal: row.kudosTotal,
    isTopContributor: badged.has(row.handleId),
  };
}

function snippet(body: string): string {
  const flat = body.replace(/\s+/g, ' ').trim();
  return flat.length <= SNIPPET_LENGTH ? flat : `${flat.slice(0, SNIPPET_LENGTH).trimEnd()}…`;
}
