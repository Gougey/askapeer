import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { and, desc, eq, isNull, lt, or, sql } from 'drizzle-orm';
import type { Queue } from 'bullmq';
import { encodeCursor, decodeCursor } from '../common/cursor';
import { DRIZZLE, type Database } from '../db/db.module';
import {
  comments,
  follows,
  handles,
  memberEmails,
  notificationPreferences,
  notifications,
  posts,
} from '../db/schema';
import { EmailSender } from './email/email.sender';
import {
  LIVE_NOTIFICATION_TYPES,
  type AccountNoticePayload,
  type KudosReceivedPayload,
  type LiveNotificationType,
  type NotificationPayload,
  type ReplyPayload,
  type ThreadActivityPayload,
  toSnippet,
} from './notification-payloads';
import type { ListNotificationsDto, UpdateNotificationPreferenceDto } from './notifications.dto';
import { NOTIFICATIONS_QUEUE } from './notifications.queue';

export type Channels = { inApp: boolean; email: boolean; push: boolean };

/** One row of the F4 matrix. */
export type PreferenceRow = Channels & {
  type: LiveNotificationType;
  /** EPIC-G §6.1 — the email toggle for this type is fixed on and must render disabled. */
  emailLocked: boolean;
};

export type NotificationItem = {
  id: string;
  type: string;
  payload: unknown;
  readAt: string | null;
  createdAt: string;
};

export type NotificationList = {
  notifications: NotificationItem[];
  nextCursor: string | null;
  unreadCount: number;
};

const DEFAULT_PAGE_SIZE = 20;

/**
 * What a member gets when they have expressed no preference. Held here, in one place,
 * rather than seeded as rows per handle × type — see the `notification_preferences`
 * comment in the schema for why (a new type would otherwise need a backfill, and any
 * handle created before it ran would silently receive nothing).
 *
 * Push is off because the channel delivers nothing at MVP (EPIC-G §6.2).
 */
const CHANNEL_DEFAULTS: Channels = { inApp: true, email: true, push: false };

@Injectable()
export class NotificationsService {
  private readonly log = new Logger(NotificationsService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    @Inject(NOTIFICATIONS_QUEUE) private readonly queue: Queue,
    private readonly email: EmailSender,
  ) {}

  /**
   * A comment was posted (EPIC-C, extended by S15).
   *
   * Two notifications come out of one comment, and the difference between them is who the
   * comment was *for*:
   *
   * 1. **`reply`** to the one member it answers — the parent comment's author for a nested
   *    reply, otherwise the post's author. Unchanged, except that it now requires them to
   *    still follow the thread (§5). Without that check an unfollow would silence the
   *    ambient half and leave the direct half arriving, and the control would be a lie.
   * 2. **`thread_activity`** to everyone else following the thread, collapsed one row per
   *    thread (§6).
   *
   * The exclusions in step 2 matter: the post's author is auto-followed by definition, so
   * without them they would get two notifications for every answer to their own question.
   */
  async handleReplyEvent(commentId: string): Promise<void> {
    const [comment] = await this.db
      .select({
        postId: comments.postId,
        actorHandleId: comments.handleId,
        parentCommentId: comments.parentCommentId,
        body: comments.body,
        status: comments.status,
      })
      .from(comments)
      .where(eq(comments.id, commentId));
    // Deleted between the event and the job running — there is nothing to announce.
    if (!comment || comment.status !== 'published') return;

    const [post] = await this.db
      .select({ title: posts.title, authorHandleId: posts.handleId, status: posts.status })
      .from(posts)
      .where(eq(posts.id, comment.postId));
    if (!post || post.status !== 'published') return;

    let recipientHandleId = post.authorHandleId;
    if (comment.parentCommentId) {
      const [parent] = await this.db
        .select({ authorHandleId: comments.handleId, status: comments.status })
        .from(comments)
        .where(eq(comments.id, comment.parentCommentId));
      if (!parent || parent.status !== 'published') return;
      recipientHandleId = parent.authorHandleId;
    }

    const [actor] = await this.db
      .select({ handleName: handles.handleName })
      .from(handles)
      .where(eq(handles.id, comment.actorHandleId));
    if (!actor) return;

    // Answering your own question, or replying to your own answer, is not news — but the
    // thread's other followers still hear about it, so this is a skip, not a return.
    const directRecipient =
      recipientHandleId === comment.actorHandleId ? null : recipientHandleId;

    if (directRecipient && (await this.follows(directRecipient, comment.postId))) {
      const payload: ReplyPayload = {
        postId: comment.postId,
        postTitle: post.title,
        commentId,
        actorHandleName: actor.handleName,
        snippet: toSnippet(comment.body),
      };
      await this.record(directRecipient, 'reply', payload, `reply:${commentId}`);
    }

    const followers = await this.db
      .select({ handleId: follows.followerHandleId })
      .from(follows)
      .where(and(eq(follows.targetType, 'post'), eq(follows.targetId, comment.postId)));

    for (const { handleId } of followers) {
      if (handleId === comment.actorHandleId || handleId === directRecipient) continue;
      await this.recordThreadActivity(handleId, {
        postId: comment.postId,
        postTitle: post.title,
        count: 1,
        actorHandleName: actor.handleName,
        lastCommentId: commentId,
      });
    }
  }

  /** Does this handle still follow the thread? The single subscription check both
   *  notification types run through (S15 §5). */
  private async follows(handleId: string, postId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ targetId: follows.targetId })
      .from(follows)
      .where(
        and(
          eq(follows.followerHandleId, handleId),
          eq(follows.targetType, 'post'),
          eq(follows.targetId, postId),
        ),
      );
    return row !== undefined;
  }

  /**
   * One `thread_activity` row per followed thread, collapsed while unread (S15 §6).
   *
   * `record()` cannot serve this: its `onConflictDoNothing` is exactly right for an event
   * that happens once, and exactly wrong for one that recurs — a lively thread would put a
   * row in the inbox per reply, and members would switch the whole type off within a week.
   * So the dedupe key is the *thread*, and the conflict is an update rather than a skip:
   *
   * - **`count`** increments while the row is unread and resets to 1 once it has been read,
   *   so the copy reads "3 new replies" and starts again after you have caught up. The
   *   `case` is the whole of that state — no second table, no read-tracking column.
   * - **`read_at = null` and `created_at = now()`** resurface the thread: a discussion you
   *   have already read still reaches you when it moves again.
   * - **The `where` on `lastCommentId`** is the idempotency guard. BullMQ retries a failed
   *   job, and without this an update-on-conflict would count the same reply twice — which
   *   is precisely the failure `record()`'s dedupe key was introduced to prevent.
   *
   * Email is capped harder than the in-app row. It goes out only when the row was inserted,
   * or when the update actually flipped `read_at` from set to null — so a burst of replies
   * on a thread you have not caught up with adds to the count silently instead of sending
   * one mail per reply.
   */
  private async recordThreadActivity(
    handleId: string,
    payload: ThreadActivityPayload,
  ): Promise<void> {
    const channels = await this.resolveChannels(handleId, 'thread_activity');
    const dedupeKey = `thread:${payload.postId}`;

    // With the in-app channel off there is no row to collapse into, and no read state to
    // key the email off — so the email cap becomes one per event, which is the best this
    // can do for a member who has turned the inbox off but left mail on.
    let shouldEmail = channels.inApp === false;

    if (channels.inApp) {
      /*
       * `as n` is load-bearing: inside ON CONFLICT the target has to be referred to by an
       * unqualified relation name, and Drizzle renders `${notifications}` schema-qualified.
       *
       * The returned `count` is how the email cap reads the *pre-update* state, which
       * RETURNING cannot otherwise see — it reports the new row, where `read_at` has just
       * been set to null regardless. A count of 1 after an update can only mean the `case`
       * reset it, which only happens when the member had already read the previous batch.
       */
      const { rows } = await this.db.execute<{ inserted: boolean; count: number }>(sql`
        insert into ${notifications} as n (handle_id, type, payload, dedupe_key)
        values (${handleId}, 'thread_activity', ${JSON.stringify(payload)}::jsonb, ${dedupeKey})
        on conflict (handle_id, dedupe_key) where dedupe_key is not null
        do update set
          payload = jsonb_build_object(
            'postId', excluded.payload->'postId',
            'postTitle', excluded.payload->'postTitle',
            'actorHandleName', excluded.payload->'actorHandleName',
            'lastCommentId', excluded.payload->'lastCommentId',
            'count', case when n.read_at is null
                          then coalesce((n.payload->>'count')::int, 1) + 1
                          else 1 end),
          read_at = null,
          created_at = now()
        where n.payload->>'lastCommentId'
              is distinct from excluded.payload->>'lastCommentId'
        returning (n.xmax = 0) as inserted, (n.payload->>'count')::int as count
      `);
      // No row: the retry guard fired, and this comment is already accounted for.
      if (rows.length === 0) return;
      // A fresh row, or one whose count just reset — either way this is the first activity
      // the member has not already seen, so it is the one that earns an email.
      shouldEmail = rows[0].inserted || Number(rows[0].count) === 1;
    }

    if (channels.email && shouldEmail) {
      await this.queue.add(
        'email',
        { handleId, type: 'thread_activity', payload },
        // One in-flight email job per (member, thread) — the same collapse as the row.
        { jobId: `email-thread-${payload.postId}-${handleId}` },
      );
    }
  }

  /** Kudos was awarded to a post or comment (EPIC-D). */
  async handleKudosEvent(
    targetType: 'post' | 'comment',
    targetId: string,
    actorHandleId: string,
  ): Promise<void> {
    const target =
      targetType === 'post'
        ? await this.postTarget(targetId)
        : await this.commentTarget(targetId);
    if (!target) return;
    // EPIC-D §3 rejects self-kudos at the API, so this only guards a future write path.
    if (target.authorHandleId === actorHandleId) return;

    const payload: KudosReceivedPayload = {
      targetType,
      postId: target.postId,
      postTitle: target.postTitle,
    };
    await this.record(
      target.authorHandleId,
      'kudos_received',
      payload,
      `kudos:${targetType}:${targetId}:${actorHandleId}`,
    );
  }

  /**
   * An account-status notice (EPIC-A decision, or an EPIC-F moderation action).
   *
   * Unlike the reply and kudos handlers this does no recipient resolution — the caller
   * has just acted on this handle and passes the payload it already holds. Nothing is
   * suppressed either: there is no "don't notify yourself" case, because the actor is
   * always a moderator or the system, never the recipient.
   */
  async handleAccountNotice(
    handleId: string,
    payload: AccountNoticePayload,
    dedupeKey: string,
  ): Promise<void> {
    await this.record(handleId, 'verification_status_change', payload, dedupeKey);
  }

  /**
   * Write the in-app row and, where the member wants it, queue the email.
   *
   * The two channels are decided independently — turning the inbox off must not silence
   * mail, and vice versa. Each has its own guard against a retried job doing the work
   * twice: the row insert dedupes on `dedupe_key`, and the email job takes a
   * deterministic id so a re-enqueue collapses onto the same job.
   */
  private async record(
    handleId: string,
    type: LiveNotificationType,
    payload: NotificationPayload,
    dedupeKey: string,
  ): Promise<void> {
    const channels = await this.resolveChannels(handleId, type);

    if (channels.inApp) {
      const [row] = await this.db
        .insert(notifications)
        .values({ handleId, type, payload, dedupeKey })
        .onConflictDoNothing()
        .returning({ id: notifications.id });
      // Nothing inserted means an earlier attempt already did all of this, email included.
      if (!row) return;
    }

    if (channels.email) {
      await this.queue.add(
        'email',
        { handleId, type, payload },
        // BullMQ reserves `:` in a job id.
        { jobId: `email-${dedupeKey.replace(/:/g, '-')}` },
      );
    }
  }

  /** The inbox (E1), newest first. */
  async list(handleId: string, query: ListNotificationsDto): Promise<NotificationList> {
    const cursor = decodeCursor(query.cursor);
    const limit = DEFAULT_PAGE_SIZE;

    const where = [eq(notifications.handleId, handleId)];
    if (query.unreadOnly) where.push(isNull(notifications.readAt));
    if (cursor) {
      where.push(
        or(
          lt(notifications.createdAt, cursor.createdAt),
          and(eq(notifications.createdAt, cursor.createdAt), lt(notifications.id, cursor.id)),
        )!,
      );
    }

    const rows = await this.db
      .select({
        id: notifications.id,
        type: notifications.type,
        payload: notifications.payload,
        readAt: notifications.readAt,
        createdAt: notifications.createdAt,
      })
      .from(notifications)
      .where(and(...where))
      .orderBy(desc(notifications.createdAt), desc(notifications.id))
      // One extra row answers "is there another page?" without a second count query.
      .limit(limit + 1);

    const page = rows.slice(0, limit);
    const last = page.at(-1);
    return {
      notifications: page.map((r) => ({
        id: r.id,
        type: r.type,
        payload: r.payload,
        readAt: r.readAt?.toISOString() ?? null,
        createdAt: r.createdAt.toISOString(),
      })),
      nextCursor: rows.length > limit && last ? encodeCursor(last.createdAt, last.id) : null,
      // Bundled with the page so opening the inbox doesn't need a second round-trip to
      // decide whether the tab badge should still be showing.
      unreadCount: await this.unreadCount(handleId),
    };
  }

  /** The tab badge. Its own endpoint because the app shell needs it on every render,
   *  where fetching a page of notifications to count them would be absurd. */
  async unreadCount(handleId: string): Promise<number> {
    const [row] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(and(eq(notifications.handleId, handleId), isNull(notifications.readAt)));
    return row?.count ?? 0;
  }

  /**
   * Mark one notification read. Scoped to the caller's handle, and a miss is a 404
   * whether the row belongs to someone else or does not exist — "this exists but isn't
   * yours" is itself a disclosure, the same rule the thread read follows (EPIC-C §13.4).
   *
   * Already-read rows keep their original `read_at`: re-marking is a no-op, not a
   * refresh, so the timestamp stays the moment the member actually saw it.
   */
  async markRead(handleId: string, notificationId: string): Promise<{ unreadCount: number }> {
    const updated = await this.db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(notifications.id, notificationId),
          eq(notifications.handleId, handleId),
          isNull(notifications.readAt),
        ),
      )
      .returning({ id: notifications.id });

    if (updated.length === 0) {
      // Distinguish "already read" (fine) from "not yours / not there" (404).
      const [existing] = await this.db
        .select({ id: notifications.id })
        .from(notifications)
        .where(and(eq(notifications.id, notificationId), eq(notifications.handleId, handleId)));
      if (!existing) throw new NotFoundException('No such notification.');
    }
    return { unreadCount: await this.unreadCount(handleId) };
  }

  async markAllRead(handleId: string): Promise<{ unreadCount: number }> {
    await this.db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.handleId, handleId), isNull(notifications.readAt)));
    return { unreadCount: 0 };
  }

  /** The F4 matrix: every live type, stored values layered over the defaults. */
  async getPreferences(handleId: string): Promise<{
    preferences: PreferenceRow[];
    /** False for the whole platform while the channel is inert (EPIC-G §6.2) — one flag
     *  rather than a per-row one, so the UI has a single place to read "coming soon". */
    pushAvailable: boolean;
  }> {
    const preferences = await Promise.all(
      LIVE_NOTIFICATION_TYPES.map(async (type) => ({
        type,
        ...(await this.resolveChannels(handleId, type)),
        emailLocked: type === 'verification_status_change',
      })),
    );
    return { preferences, pushAvailable: false };
  }

  /**
   * Set one type's three channels. Rejects disabling the verification-status email
   * (EPIC-G §6.1) here as well as in the CHECK constraint — the constraint is the
   * guarantee, this is the sentence a member can understand.
   */
  async setPreference(
    handleId: string,
    dto: UpdateNotificationPreferenceDto,
  ): Promise<PreferenceRow> {
    if (dto.type === 'verification_status_change' && !dto.emailEnabled) {
      throw new BadRequestException(
        'Email for verification and account-status changes cannot be turned off.',
      );
    }

    const values = {
      handleId,
      type: dto.type,
      inAppEnabled: dto.inAppEnabled,
      emailEnabled: dto.emailEnabled,
      pushEnabled: dto.pushEnabled,
    };
    await this.db
      .insert(notificationPreferences)
      .values(values)
      .onConflictDoUpdate({
        target: [notificationPreferences.handleId, notificationPreferences.type],
        set: {
          inAppEnabled: values.inAppEnabled,
          emailEnabled: values.emailEnabled,
          pushEnabled: values.pushEnabled,
        },
      });

    return {
      type: dto.type,
      ...(await this.resolveChannels(handleId, dto.type)),
      emailLocked: dto.type === 'verification_status_change',
    };
  }

  /**
   * Stored preferences layered over the defaults. `verification_status_change` email is
   * forced on regardless of what is stored (EPIC-G §6.1) — belt and braces alongside the
   * CHECK constraint that stops it being stored as false in the first place.
   */
  async resolveChannels(handleId: string, type: LiveNotificationType): Promise<Channels> {
    const [pref] = await this.db
      .select({
        inApp: notificationPreferences.inAppEnabled,
        email: notificationPreferences.emailEnabled,
        push: notificationPreferences.pushEnabled,
      })
      .from(notificationPreferences)
      .where(
        and(
          eq(notificationPreferences.handleId, handleId),
          eq(notificationPreferences.type, type),
        ),
      );
    const channels = pref ?? CHANNEL_DEFAULTS;
    return type === 'verification_status_change' ? { ...channels, email: true } : channels;
  }

  /**
   * Send one notification's email. A separate job from the event that produced it, so a
   * transient send failure retries by itself rather than re-running recipient
   * resolution — and so it works whether or not an in-app row was written.
   */
  async deliverEmail(
    handleId: string,
    type: string,
    payload: NotificationPayload,
  ): Promise<void> {
    const [row] = await this.db
      // Read through `identity.member_emails`, not `identity.members` (EPIC-G §3): the
      // view exposes `email` and nothing else, so `legal_name` is not merely unused here
      // — it is not reachable. At the AWS migrate step the notification role is granted
      // on the view and not the table, and this query keeps working unchanged.
      .select({ email: memberEmails.email })
      .from(handles)
      .innerJoin(memberEmails, eq(memberEmails.memberId, handles.memberId))
      .where(eq(handles.id, handleId));
    if (!row) return;

    if (type === 'reply') {
      const p = payload as ReplyPayload;
      await this.email.reply(row.email, p.actorHandleName, p.postTitle, p.postId);
      return;
    }
    if (type === 'thread_activity') {
      const p = payload as ThreadActivityPayload;
      await this.email.threadActivity(row.email, p.postTitle, p.postId, p.count);
      return;
    }
    if (type === 'kudos_received') {
      const p = payload as KudosReceivedPayload;
      await this.email.kudosReceived(row.email, p.targetType, p.postTitle, p.postId);
      return;
    }
    if (type === 'verification_status_change') {
      const p = payload as AccountNoticePayload;
      await this.email.accountNotice(row.email, p.event, p.reason ?? null, {
        newHandleName: p.newHandleName,
        actionId: p.actionId,
        status: p.status,
      });
      return;
    }
    this.log.warn(`No email template for notification type ${type}`);
  }

  private async postTarget(postId: string) {
    const [row] = await this.db
      .select({ title: posts.title, authorHandleId: posts.handleId, status: posts.status })
      .from(posts)
      .where(eq(posts.id, postId));
    if (!row || row.status !== 'published') return undefined;
    return { authorHandleId: row.authorHandleId, postId, postTitle: row.title };
  }

  private async commentTarget(commentId: string) {
    const [row] = await this.db
      .select({
        authorHandleId: comments.handleId,
        status: comments.status,
        postId: comments.postId,
        postTitle: posts.title,
        postStatus: posts.status,
      })
      .from(comments)
      .innerJoin(posts, eq(posts.id, comments.postId))
      .where(eq(comments.id, commentId));
    if (!row || row.status !== 'published' || row.postStatus !== 'published') return undefined;
    return { authorHandleId: row.authorHandleId, postId: row.postId, postTitle: row.postTitle };
  }
}

