import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../db/db.module';
import { handles, members } from '../db/schema';
import { EmailSender } from '../notifications/email.sender';
import { NotificationEvents } from '../notifications/notifications.queue';

/**
 * Status-change delivery, and the one place EPIC-G §4's asymmetry is decided.
 *
 * That section splits `verification_status_change` into two mechanisms depending on
 * whether the member has a handle yet, and this is the branch:
 *
 * | Applicant state | Delivery | Storage |
 * |---|---|---|
 * | Pre-handle (`pending`, `needs_more_info`, `rejected`) | email only, sent here | no notification row — there is no `handle_id` to attach one to |
 * | Post-handle (suspension, expulsion, later decisions) | EPIC-G's normal path | ordinary handle-scoped row |
 *
 * A rejected applicant, by definition, never gets a handle — so the top row is not an
 * edge case to tidy away later, it is permanent. The `community.notifications` foreign
 * key enforces it underneath this.
 */
@Injectable()
export class StatusChangeNotifier {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly email: EmailSender,
    private readonly events: NotificationEvents,
  ) {}

  async statusChanged(
    memberId: string,
    toStatus: string,
    reason: string | null,
    decisionId: string,
  ): Promise<void> {
    const [handle] = await this.db
      .select({ id: handles.id })
      .from(handles)
      .where(eq(handles.memberId, memberId));

    if (handle) {
      // Post-handle: EPIC-G owns delivery, across whichever channels the member has left
      // on — except the email, which for this type cannot be turned off (§6.1). That is
      // what makes a suspension reach someone the access gate has already locked out.
      await this.events.accountNotice(
        handle.id,
        { event: eventFor(toStatus), status: toStatus, reason },
        decisionId,
      );
      return;
    }

    // Pre-handle: email only, and only for the statuses an applicant should hear about
    // directly. `expelled`/`suspended` never occur here — both require a handle.
    if (!['approved_verified', 'needs_more_info', 'rejected'].includes(toStatus)) return;

    const [member] = await this.db
      .select({ email: members.email })
      .from(members)
      .where(eq(members.id, memberId));
    if (!member) return;

    await this.email.send({
      to: member.email,
      subject: 'Your Askapeer verification',
      body: `status=${toStatus}${reason ? ` reason="${reason}"` : ''}`,
    });
  }
}

/** Which notice copy a verification status maps onto (see `AccountNoticePayload`). */
function eventFor(toStatus: string): 'verification' | 'expelled' {
  return toStatus === 'expelled' ? 'expelled' : 'verification';
}
