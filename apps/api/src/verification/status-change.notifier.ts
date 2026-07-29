import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../db/db.module';
import { members } from '../db/schema';
import { EmailSender } from '../notifications/email.sender';

/**
 * The pre-handle status-change email (S2, EPIC-G §4).
 *
 * This lives outside the notification store on purpose, and permanently: at this point
 * in the journey the applicant has no handle, so there is no `community.notifications`
 * row to write — the table is handle-keyed and its foreign key says so. A rejected
 * applicant never gets one at all. Email is the only channel that reaches them.
 *
 * Delivery now goes through the shared `EmailSender` (still a stub) rather than this
 * class logging its own line, so there is one seam to bind a real provider to.
 */
@Injectable()
export class StatusChangeNotifier {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly email: EmailSender,
  ) {}

  async statusChanged(memberId: string, toStatus: string, reason: string | null): Promise<void> {
    // Only the statuses the applicant should hear about directly.
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
