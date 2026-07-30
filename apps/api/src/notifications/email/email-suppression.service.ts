import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../../db/db.module';
import { emailSuppressions } from '../../db/schema';

export type SuppressionKind = 'hard_bounce' | 'spam_complaint' | 'manual';

/**
 * Addresses we must not mail, and the check every send passes through.
 *
 * The rule is deliberately blunt: **once an address is suppressed, nothing goes to it** —
 * not even the account-status mail that EPIC-G §6.1 makes non-optional. That looks like a
 * contradiction and is not: §6.1 stops a *member* from switching that channel off, because
 * they must be told when their access changes. It says nothing about an address that
 * physically cannot receive mail. Continuing to send to a hard-bounced address does not
 * inform anybody; it only teaches the provider that we ignore bounces.
 *
 * What that does mean is a member whose address has died can end up unreachable — which is
 * a real gap, not a solved problem. It needs an admin surface showing suppressed addresses
 * so a human can chase it (`email_suppressions_active_idx` exists for exactly that read).
 * That surface is not built yet; until it is, suppression is logged at warn level so it is
 * at least visible.
 */
@Injectable()
export class EmailSuppressionService {
  private readonly log = new Logger(EmailSuppressionService.name);

  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /** Idempotent: a provider re-delivering the same bounce must not churn the record. */
  async suppress(email: string, kind: SuppressionKind, reason: string | null): Promise<void> {
    const address = email.trim().toLowerCase();
    await this.db
      .insert(emailSuppressions)
      .values({ email: address, kind, reason })
      .onConflictDoUpdate({
        target: emailSuppressions.email,
        // A fresh event on an already-suppressed address re-opens it: the latest reason is
        // the useful one, and `cleared_at` is reset so a manual clear does not silently
        // outlive a later bounce.
        set: { kind, reason, clearedAt: null },
      });
  }

  async isSuppressed(email: string): Promise<boolean> {
    const [row] = await this.db
      .select({ email: emailSuppressions.email })
      .from(emailSuppressions)
      .where(
        and(
          eq(emailSuppressions.email, email.trim().toLowerCase()),
          isNull(emailSuppressions.clearedAt),
        ),
      );
    return row !== undefined;
  }

  /** For when an address is known good again — a member updating it, or a mistaken complaint. */
  async clear(email: string): Promise<void> {
    await this.db
      .update(emailSuppressions)
      .set({ clearedAt: new Date() })
      .where(eq(emailSuppressions.email, email.trim().toLowerCase()));
    this.log.log(`Email suppression cleared for ${email}`);
  }
}
