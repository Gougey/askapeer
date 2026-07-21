import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, desc, eq, inArray, isNull, lt, or, sql } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../db/db.module';
import { categories, comments, handles, postTags, posts, tags } from '../db/schema';
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
  /** EPIC-D §6 computes this from the Redis kudos ranking (S5); shape is fixed now so
   *  the client doesn't change when it starts returning true. */
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
  createdAt: string;
  editedAt: string | null;
};

export type PostList = { posts: PostCard[]; nextCursor: string | null };

export type ThreadComment = {
  id: string;
  author: AuthorBlock;
  body: string;
  parentCommentId: string | null;
  /** EPIC-D (S5) — no comment kudos column exists yet, so this is 0 for every row. */
  kudosCount: number;
  createdAt: string;
  editedAt: string | null;
};

/** The thread DTO (EPIC-C §13.1). `viewerContext` is bundled so the client can render
 *  every control state in one round-trip rather than N follow-up calls. */
export type Thread = {
  post: Omit<PostCard, 'snippet'> & { body: string; status: string };
  comments: ThreadComment[];
  viewerContext: { isAuthor: boolean };
};

@Injectable()
export class PostsService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

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
   */
  async list(query: ListPostsDto): Promise<PostList> {
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
      })
      .from(posts)
      .innerJoin(handles, eq(posts.handleId, handles.id))
      .innerJoin(categories, eq(posts.categoryId, categories.id))
      // A tag filter needs the join table; the semi-join keeps one row per post even
      // though a post can match on several tags.
      .where(
        and(
          eq(posts.status, 'published'),
          query.category ? eq(posts.categoryId, query.category) : undefined,
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
    const tagsByPost = await this.tagsFor(page.map((r) => r.id));
    const last = page.at(-1);

    return {
      posts: page.map((row) => ({
        id: row.id,
        type: row.type,
        title: row.title,
        snippet: snippet(row.body),
        category: { id: row.categoryId, name: row.categoryName },
        tags: tagsByPost.get(row.id) ?? [],
        author: authorBlock(row),
        answerCount: Number(row.answerCount),
        createdAt: row.createdAt.toISOString(),
        editedAt: row.editedAt?.toISOString() ?? null,
      })),
      nextCursor: rows.length > limit && last ? encodeCursor(last.createdAt, last.id) : null,
    };
  }

  /**
   * A single thread (screen C4).
   *
   * `draft` and `needs_correction` posts are returned **only to their author** (EPIC-C
   * §13.4, gap G-8) — to anyone else they 404 rather than 403, since "this exists but
   * you can't see it" is itself a disclosure. Nothing in S4 creates those statuses, but
   * the rule lives at the read layer so EPIC-E (S9) inherits it rather than re-deriving it.
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

    const [tagsByPost, answers] = await Promise.all([
      this.tagsFor([row.id]),
      this.commentsFor(row.id),
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
        author: authorBlock(row),
        answerCount: Number(row.answerCount),
        createdAt: row.createdAt.toISOString(),
        editedAt: row.editedAt?.toISOString() ?? null,
      },
      comments: answers,
      viewerContext: { isAuthor },
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
   * Answers on a thread. Empty until S5 opens the write path — the read exists now so
   * `answer_count` and the thread body come from one consistent place, and S5 only has
   * to change the ordering to EPIC-D's kudos rank.
   */
  private async commentsFor(postId: string): Promise<ThreadComment[]> {
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
      .where(and(eq(comments.postId, postId), eq(comments.status, 'published')))
      .orderBy(asc(comments.createdAt));

    return rows.map((row) => ({
      id: row.id,
      author: authorBlock(row),
      body: row.body,
      parentCommentId: row.parentCommentId,
      kudosCount: 0,
      createdAt: row.createdAt.toISOString(),
      editedAt: row.editedAt?.toISOString() ?? null,
    }));
  }
}

/** Published answers only — a removed answer shouldn't inflate the count on a card. */
const answerCountSql = sql<number>`(
  select count(*) from ${comments}
  where ${comments.postId} = ${posts.id} and ${comments.status} = 'published'
)`;

function authorBlock(row: {
  handleId: string;
  handleName: string;
  kudosTotal: number;
}): AuthorBlock {
  return {
    handleId: row.handleId,
    handleName: row.handleName,
    kudosTotal: row.kudosTotal,
    isTopContributor: false,
  };
}

function snippet(body: string): string {
  const flat = body.replace(/\s+/g, ' ').trim();
  return flat.length <= SNIPPET_LENGTH ? flat : `${flat.slice(0, SNIPPET_LENGTH).trimEnd()}…`;
}

/**
 * The cursor is opaque to the client on purpose — it encodes the sort key, so making it
 * readable would invite callers to construct one and pin the ordering contract in place.
 */
function encodeCursor(createdAt: Date, id: string): string {
  return Buffer.from(`${createdAt.toISOString()}|${id}`).toString('base64url');
}

function decodeCursor(cursor?: string): { createdAt: Date; id: string } | null {
  if (!cursor) return null;
  const [iso, id] = Buffer.from(cursor, 'base64url').toString().split('|');
  const createdAt = new Date(iso ?? '');
  // A malformed cursor is a bad request, not an empty page — silently returning nothing
  // would look like "you've reached the end" to anyone paginating.
  if (!id || Number.isNaN(createdAt.getTime())) throw new BadRequestException('Invalid cursor.');
  return { createdAt, id };
}
