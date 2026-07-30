import {
  Body,
  Controller,
  ForbiddenException,
  Headers,
  HttpCode,
  Logger,
  Post,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';
import { EmailSuppressionService } from './email-suppression.service';

/** The subset of Postmark's webhook payloads we act on. */
type PostmarkWebhook = {
  RecordType?: string;
  /** Bounce only: `HardBounce`, `SoftBounce`, `Transient`, `SpamNotification`, … */
  Type?: string;
  Email?: string;
  Description?: string;
  Details?: string;
};

/**
 * Bounce and spam-complaint events from Postmark.
 *
 * Without this we honour Postmark's suppression list only passively — we stop retrying
 * what it rejects — but we never *learn* from it: a dead address stays enabled on our
 * side, and a spam complaint tells us nothing at all. Both are things a sender is expected
 * to act on, and a sender that doesn't loses its reputation and eventually its account.
 *
 * **Authentication is HTTP Basic**, which is what Postmark's webhook URL field supports:
 * `https://postmark:<secret>@api.example/v1/webhooks/postmark`. The alternative — a secret
 * in a query string — ends up in proxy and access logs. Compared in constant time, and if
 * no secret is configured the endpoint refuses everything rather than defaulting open: an
 * unauthenticated endpoint that suppresses email addresses is a denial-of-service control
 * handed to the internet.
 */
@Controller('webhooks/postmark')
export class PostmarkWebhookController {
  private readonly log = new Logger(PostmarkWebhookController.name);

  constructor(
    private readonly suppressions: EmailSuppressionService,
    private readonly config: ConfigService,
  ) {}

  @Post()
  @HttpCode(200)
  async handle(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: PostmarkWebhook,
  ): Promise<{ ok: true }> {
    this.assertAuthorised(authorization);

    const email = body.Email?.trim();
    const record = body.RecordType;

    // Postmark can be configured to send more event types than we act on (Delivery, Open,
    // Click). Acknowledge them with a 200 — anything else and Postmark retries, then
    // disables the webhook.
    if (!email) return { ok: true };

    if (record === 'SpamComplaint') {
      await this.suppressions.suppress(email, 'spam_complaint', body.Description ?? null);
      this.log.warn(`Spam complaint from ${email} — email suppressed for that address.`);
      return { ok: true };
    }

    if (record === 'Bounce') {
      // Only hard failures suppress. A soft bounce is a full mailbox or a temporary server
      // problem; suppressing on one would cut off a member over a transient condition, and
      // Postmark already handles the retrying.
      const hard = body.Type === 'HardBounce' || body.Type === 'BadEmailAddress';
      if (hard) {
        await this.suppressions.suppress(email, 'hard_bounce', body.Description ?? body.Details ?? null);
        this.log.warn(`Hard bounce for ${email} (${body.Type}) — email suppressed for that address.`);
      } else {
        this.log.log(`Soft bounce for ${email} (${body.Type ?? 'unknown'}) — not suppressing.`);
      }
    }

    return { ok: true };
  }

  private assertAuthorised(authorization: string | undefined): void {
    const secret = this.config.get<string>('POSTMARK_WEBHOOK_SECRET');
    if (!secret) {
      this.log.error('POSTMARK_WEBHOOK_SECRET is not set — rejecting webhook delivery.');
      throw new ForbiddenException();
    }
    const supplied = basicAuthPassword(authorization);
    if (!supplied || !constantTimeEqual(supplied, secret)) throw new ForbiddenException();
  }
}

function basicAuthPassword(header: string | undefined): string | undefined {
  if (!header?.startsWith('Basic ')) return undefined;
  const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
  const separator = decoded.indexOf(':');
  return separator === -1 ? undefined : decoded.slice(separator + 1);
}

/** Length is compared first because `timingSafeEqual` throws on a mismatch. */
function constantTimeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
