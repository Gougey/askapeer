import { Injectable, Logger } from '@nestjs/common';

export type OutboundEmail = { to: string; subject: string; body: string };

/**
 * The one place mail leaves the platform.
 *
 * Still a stub: it logs what would be sent, exactly as S1 did for the magic link and S2
 * for the pre-handle status email. Wiring a real sender (SES per the architecture spec
 * §6, or Postmark) is a change to this binding alone — every call site is already the
 * production path, which is the same shape the verification providers use.
 *
 * Two constraints belong to this seam rather than to its callers:
 *
 * - **Address by handle, never by name.** EPIC-G §3: this epic is one of only three with
 *   any grant into `identity`, and it is there to read `email` and nothing else.
 * - The grant will target an **email-only view** (`identity.member_emails`) rather than
 *   `identity.members`, turning that from discipline into a permission. The view is not
 *   built yet because the prove phase runs under a single database role, so it would
 *   name the guarantee without providing it; it lands with the real sender and the role
 *   split, at the AWS migrate step.
 */
@Injectable()
export class EmailSender {
  private readonly log = new Logger(EmailSender.name);

  async send(email: OutboundEmail): Promise<void> {
    this.log.log(`[email:stub] to=${email.to} subject="${email.subject}" body="${email.body}"`);
  }
}
