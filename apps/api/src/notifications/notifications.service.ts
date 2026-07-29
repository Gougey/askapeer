import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import type { Queue } from 'bullmq';
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
  type KudosReceivedPayload,
  type NotificationPayload,
  type ReplyPayload,
  toSnippet,
} from './notification-payloads';
import { NOTIFICATIONS_QUEUE } from './notifications.queue';

/** The types S10 actually fires. `mention` and `weekly_digest` exist in the enum but
 *  wait on EPIC-C's parser and `community.follows` respectively. */
export type LiveNotificationType = 'reply' | 'kudos_received' | 'verification_status_change';

export type Channels = { inApp: boolean; email: boolean; push: boolean };

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
  return undefined;
}
