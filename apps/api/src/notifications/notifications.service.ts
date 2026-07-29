import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { and, desc, eq, isNull, lt, or, sql } from 'drizzle-orm';
import type { Queue } from 'bullmq';
import { encodeCursor, decodeCursor } from '../common/cursor';
import { DRIZZLE, type Database } from '../db/db.module';
import {
  comments,
  handles,
  members,
  notificationPreferences,
  notifications,
  posts,
} from '../db/schema';
import { EmailSender } from './email.sender';
import {
  LIVE_NOTIFICATION_TYPES,
  type AccountNoticePayload,
  type KudosReceivedPayload,
  type LiveNotificationType,
  type NotificationPayload,
  type ReplyPayload,
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
   * A comment was posted (EPIC-C). The recipient is the parent comment's author for a
   * nested reply, otherwise the post's author.
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

    // Answering your own question, or replying to your own answer, is not news.
    if (recipientHandleId === comment.actorHandleId) return;

    const [actor] = await this.db
      .select({ handleName: handles.handleName })
      .from(handles)
      .where(eq(handles.id, comment.actorHandleId));
    if (!actor) return;

    const payload: ReplyPayload = {
      postId: comment.postId,
      postTitle: post.title,
      commentId,
      actorHandleName: actor.handleName,
      snippet: toSnippet(comment.body),
    };
    await this.record(recipientHandleId, 'reply', payload, `reply:${commentId}`);
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
      .select({
        // The only column this epic reads from `identity` (EPIC-G §3). Never `legal_name`
        // — every template addresses the member by handle, and the eventual email-only
        // view is what will make that a permission rather than a promise.
        email: members.email,
      })
      .from(handles)
      .innerJoin(members, eq(members.id, handles.memberId))
      .where(eq(handles.id, handleId));
    if (!row) return;

    const copy = emailCopy(type, payload);
    if (!copy) {
      this.log.warn(`No email copy for notification type ${type}`);
      return;
    }
    await this.email.send({ to: row.email, subject: copy.subject, body: copy.body });
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

/**
 * Email copy per type. Plain English here rather than a message catalog: the catalog is
 * the web app's (`messages/en-GB.json`), and no API-side i18n mechanism exists yet.
 * Templating and translation arrive with the real sender — at which point this is the
 * one function to replace.
 *
 * Copy names handles only, and never quotes a case discussion's body — the same
 * discipline the payloads carry (EPIC-G §6.2), applied to the channel that leaves the
 * platform.
 */
function emailCopy(
  type: string,
  payload: NotificationPayload,
): { subject: string; body: string } | undefined {
  if (type === 'reply') {
    const p = payload as ReplyPayload;
    return {
      subject: `${p.actorHandleName} replied to you on Askapeer`,
      body: `${p.actorHandleName} replied on “${p.postTitle}”.`,
    };
  }
  if (type === 'kudos_received') {
    const p = payload as KudosReceivedPayload;
    return {
      subject: 'You received kudos on Askapeer',
      body: `Your ${p.targetType === 'post' ? 'question' : 'answer'} on “${p.postTitle}” received kudos.`,
    };
  }
  if (type === 'verification_status_change') {
    const p = payload as AccountNoticePayload;
    const because = p.reason ? ` Reason given: ${p.reason}` : '';
    switch (p.event) {
      case 'warned':
        return {
          subject: 'A moderator has issued a warning',
          body: `A moderator has recorded a formal warning against your handle.${because}`,
        };
      case 'content_removed':
        return {
          subject: 'A moderator removed your content',
          body: `A moderator has removed one of your contributions from Askapeer.${because}`,
        };
      case 'suspended':
        // The one that most needs email: a suspended member cannot reach the in-app
        // inbox, because the access gate stops them at the holding page.
        return {
          subject: 'Your Askapeer access has been suspended',
          body: `Your handle has been suspended and you cannot access the community while it is.${because}`,
        };
      case 'expelled':
        return {
          subject: 'Your Askapeer membership has ended',
          body: `Your handle has been permanently removed from Askapeer.${because}`,
        };
      case 'handle_renamed':
        return {
          subject: 'Your handle has been changed',
          body: `A moderator has changed your handle to ${p.newHandleName}. Your contributions are unchanged.${because}`,
        };
      default:
        return {
          subject: 'Your Askapeer verification',
          body: `status=${p.status ?? 'updated'}${p.reason ? ` reason="${p.reason}"` : ''}`,
        };
    }
  }
  return undefined;
}
