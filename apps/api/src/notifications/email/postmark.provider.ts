import { Injectable, Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { EmailProvider, OutboundEmail } from './email-provider';

const POSTMARK_API = 'https://api.postmarkapp.com/email';

/**
 * Postmark's own error codes, for the two that need handling rather than retrying.
 * https://postmarkapp.com/developer/api/overview#error-codes
 */
const INACTIVE_RECIPIENT = 406;
const INVALID_EMAIL = 300;

/**
 * Outbound mail via Postmark.
 *
 * Chosen over SES for the prove phase: a single API token and one HTTP call, against
 * SES's IAM credentials plus a sandbox-exit request. The architecture spec (§6) names SES
 * in `eu-west-1` for the AWS target, and this is not a change to that — the provider seam
 * is exactly what makes swapping at the migrate step a binding change.
 *
 * No SDK. One POST with `fetch`, which Node has natively — a dependency for this would be
 * more code to audit than the code it replaces, in a repo where every dependency is a
 * supply-chain surface.
 *
 * Sends on the **transactional** stream. Everything the platform sends today is
 * transactional (a sign-in link, a reply, an account notice); the weekly digest, when it
 * arrives, is broadcast content and belongs on a separate stream with its own reputation.
 */
@Injectable()
export class PostmarkEmailProvider implements EmailProvider {
  private readonly log = new Logger(PostmarkEmailProvider.name);
  private readonly token: string;
  private readonly from: string;
  private readonly replyTo: string | null;

  constructor(config: ConfigService) {
    // getOrThrow: a missing token must fail at boot, not at the first send. The
    // alternative is an app that looks healthy and quietly cannot let anyone sign in.
    this.token = config.getOrThrow<string>('POSTMARK_TOKEN');
    this.from = config.get<string>('EMAIL_FROM') ?? 'AskaPeer <no-reply@mail.askapeer.co.uk>';
    /*
     * Where a reply goes. The From is on `mail.askapeer.co.uk`, a send-only subdomain with
     * no MX, so without this every reply is discarded silently — including the ones from
     * the two emails that invite one, where a suspended or expelled member has no other
     * route to appeal because they cannot open the app.
     */
    this.replyTo = config.get<string>('EMAIL_REPLY_TO') ?? null;
  }

  async send(email: OutboundEmail): Promise<void> {
    let res: Response;
    try {
      res = await fetch(POSTMARK_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-Postmark-Server-Token': this.token,
        },
        body: JSON.stringify({
          From: this.from,
          ...(this.replyTo ? { ReplyTo: this.replyTo } : {}),
          To: email.to,
          Subject: email.subject,
          TextBody: email.text,
          ...(email.html ? { HtmlBody: email.html } : {}),
          MessageStream: 'outbound',
        }),
      });
    } catch (err) {
      // Network-level failure. Worth retrying, so it propagates: the notification queue
      // will back off and try again, and a magic-link request will surface an error to
      // someone who would otherwise wait forever for mail that was never sent.
      throw new Error(`Postmark unreachable: ${(err as Error).message}`);
    }

    // Postmark answers 200 on success and 4xx with a numeric ErrorCode otherwise. Read
    // the body either way — the code is what distinguishes "try again" from "never will".
    const body = (await res.json().catch(() => ({}))) as { ErrorCode?: number; Message?: string };

    if (res.ok && !body.ErrorCode) return;

    // A recipient Postmark has marked inactive (hard bounce, or a spam complaint) will
    // never accept mail. Retrying is pointless and burns the queue's attempts, so this is
    // logged and swallowed — the in-app notification still stands, and a dead address is
    // an account problem to resolve, not a delivery one.
    if (body.ErrorCode === INACTIVE_RECIPIENT || body.ErrorCode === INVALID_EMAIL) {
      this.log.warn(
        `Postmark will not deliver to ${email.to} (code ${body.ErrorCode}: ${body.Message}). ` +
          'Not retrying.',
      );
      return;
    }

    throw new Error(
      `Postmark rejected the message (HTTP ${res.status}, code ${body.ErrorCode ?? 'none'}): ${body.Message ?? 'no message'}`,
    );
  }
}
