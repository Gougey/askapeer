import { Injectable, Logger } from '@nestjs/common';

/** Injection token for the outbound-mail transport. */
export const EMAIL_PROVIDER = Symbol('EMAIL_PROVIDER');

export type OutboundEmail = {
  to: string;
  subject: string;
  /** Always present. Plain text is the accessible, deliverable, screen-reader-friendly
   *  version, and the only one some clients will render. */
  text: string;
  /** Optional richer version; clients that can't render it fall back to `text`. */
  html?: string;
};

/**
 * The transport. One method, deliberately — the same shape the verification providers
 * use, so swapping a stub for a real service is a binding change in the module and
 * nothing else moves.
 *
 * Implementations must not decide *what* to send. Copy lives in `templates.ts`, because
 * the anonymity rules that govern it (address by handle, never by name; never quote a
 * case discussion) are a domain constraint, not a transport concern.
 */
export interface EmailProvider {
  send(email: OutboundEmail): Promise<void>;
}

/**
 * The default, and what every environment uses until a real sender is configured: log
 * what would have been sent.
 *
 * This is not a placeholder to be embarrassed about — it is how the whole notification
 * path has been exercised end to end without an account existing, in the same way the
 * simulated register lookup and identity check stand in for HCPC and Onfido. What it is
 * *not* is safe to leave in a real environment, which is why `EmailModule` logs a warning
 * at boot when it is bound outside development.
 */
@Injectable()
export class LoggingEmailProvider implements EmailProvider {
  private readonly log = new Logger(LoggingEmailProvider.name);

  async send(email: OutboundEmail): Promise<void> {
    this.log.log(
      `[email:stub] to=${email.to} subject="${email.subject}" body="${email.text.replace(/\s+/g, ' ').trim()}"`,
    );
  }
}
