import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../db/db.module';
import { members } from '../db/schema';

/**
 * The pre-handle status-change email (S2). Real delivery is EPIC-G's (S10) — until an
 * email sender exists this logs what would be sent, matching how S1 handled the magic
 * link. The call site in VerificationService does not change when S10 lands.
 *
 * Pre-handle is the reason this lives here rather than waiting for EPIC-G: at this
 * point in the journey the applicant has no handle and no in-app surface to notify on,
 * so email is the only channel that reaches them.
 */
@Injectable()
export class StatusChangeNotifier {
  private readonly log = new Logger(StatusChangeNotifier.name);

  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async statusChanged(memberId: string, toStatus: string, reason: string | null): Promise<void> {
    // Only the statuses the applicant should hear about directly.
    if (!['approved_verified', 'needs_more_info', 'rejected'].includes(toStatus)) return;

    const [member] = await this.db
      .select({ email: members.email })
      .from(members)
      .where(eq(members.id, memberId));
    if (!member) return;

    this.log.log(
      `[email:stub] to=${member.email} subject="Your Askapeer verification" status=${toStatus}` +
        (reason ? ` reason="${reason}"` : ''),
    );
  }
}
