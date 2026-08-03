import { Body, Controller, Get, Inject, Post, UseGuards } from '@nestjs/common';
import { IsEmail, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RateLimit } from '../common/rate-limit/rate-limit.decorator';
import { EMAIL_PROVIDER, type EmailProvider } from '../notifications/email/email-provider';
import { EmailSender } from '../notifications/email/email.sender';
import { AdminGuard } from './admin.guard';

/**
 * Every template a member can receive, and the one call that produces it.
 *
 * Enumerated rather than free-form: the point is to exercise the *real* templates through
 * the real sender, so a body-and-subject endpoint would prove nothing about the mail
 * members actually get.
 */
const TEMPLATES = [
  'magic-link',
  'verification-approved',
  'verification-rejected',
  'verification-needs-more-info',
  'reply',
  'kudos-post',
  'kudos-comment',
  'notice-warned',
  'notice-content-removed',
  'notice-suspended',
  'notice-expelled',
  'notice-correction-requested',
  'notice-handle-renamed',
] as const;

type TemplateName = (typeof TEMPLATES)[number];

export class EmailTestDto {
  @IsEmail()
  to!: string;

  @IsIn(TEMPLATES as unknown as string[])
  template!: TemplateName;

  /** Optional stand-in for the moderator's reason, to see how a long one wraps. */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

/**
 * Send one real email, of one real template, to one address — admin only.
 *
 * **Why this exists.** Postmark caps an unapproved account at 100 test emails to your own
 * domain, and there are thirteen distinct member-facing templates. Producing them by
 * driving the app would burn that allowance and is impossible for several: you cannot see
 * the "expelled" email without expelling somebody, or the correction notice without
 * sending a real case back. This renders each one on demand, so the whole set can be
 * checked in a real mail client for a fraction of the budget.
 *
 * It stays useful after approval as the way to see a template change without staging a
 * moderation action to trigger it.
 *
 * Not a general "send mail" endpoint: the template is a closed set, the recipient is the
 * only free field, and both guards plus a rate limit sit in front of it — an admin
 * credential should not become a way to mail arbitrary text to arbitrary people.
 */
@Controller('admin/email-test')
@UseGuards(JwtAuthGuard, AdminGuard)
export class EmailTestController {
  constructor(
    private readonly sender: EmailSender,
    @Inject(EMAIL_PROVIDER) private readonly provider: EmailProvider,
  ) {}

  /**
   * What is available, and — more usefully — whether mail would actually leave the
   * building. `LoggingEmailProvider` looks identical to success from the caller's side,
   * which is precisely the confusion worth pre-empting before spending the allowance.
   */
  @Get()
  options() {
    return {
      templates: TEMPLATES,
      provider: this.provider.constructor.name,
      willActuallySend: this.provider.constructor.name !== 'LoggingEmailProvider',
    };
  }

  // Deliberately tight. The Postmark allowance is 100 while unapproved, and a stuck
  // finger on a repeat request should not spend it.
  @RateLimit({ windowSeconds: 3600, limits: { ip: 30 } })
  @Post()
  async send(@Body() dto: EmailTestDto) {
    const reason = dto.reason ?? 'Sample reason text, for checking how this reads in a real client.';
    const title = 'Hamstring rehab timelines — who is still using 9 months?';
    const postId = '00000000-0000-0000-0000-000000000000';

    switch (dto.template) {
      case 'magic-link':
        await this.sender.magicLink(dto.to, 'sample-token-not-valid-for-sign-in');
        break;
      case 'verification-approved':
        await this.sender.verificationStatus(dto.to, 'approved_verified', null);
        break;
      case 'verification-rejected':
        await this.sender.verificationStatus(dto.to, 'rejected', reason);
        break;
      case 'verification-needs-more-info':
        await this.sender.verificationStatus(dto.to, 'needs_more_info', reason);
        break;
      case 'reply':
        await this.sender.reply(dto.to, 'MrFixit', title, postId);
        break;
      case 'kudos-post':
        await this.sender.kudosReceived(dto.to, 'post', title, postId);
        break;
      case 'kudos-comment':
        await this.sender.kudosReceived(dto.to, 'comment', title, postId);
        break;
      default: {
        // The notice templates differ only by event, so they share one branch rather than
        // six near-identical ones.
        const event = dto.template.replace('notice-', '').replace(/-/g, '_');
        await this.sender.accountNotice(dto.to, event, reason, {
          actionId: postId,
          newHandleName: 'QuietOtter-41',
          status: 'suspended',
        });
      }
    }

    return {
      sent: true,
      template: dto.template,
      to: dto.to,
      provider: this.provider.constructor.name,
      willActuallySend: this.provider.constructor.name !== 'LoggingEmailProvider',
    };
  }
}
