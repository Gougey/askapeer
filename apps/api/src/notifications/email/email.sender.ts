import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EMAIL_PROVIDER, type EmailProvider, type OutboundEmail } from './email-provider';
import { templates } from './templates';

/**
 * The one place mail leaves the platform.
 *
 * Callers ask for a *template*, never for a body — `sender.magicLink(email, token)`, not
 * `sender.send({ subject, text })`. That is what keeps the anonymity and no-quoting rules
 * (see `templates.ts`) in one reviewable file instead of spread across every epic that
 * happens to need to tell someone something.
 */
@Injectable()
export class EmailSender {
  constructor(
    @Inject(EMAIL_PROVIDER) private readonly provider: EmailProvider,
    private readonly config: ConfigService,
  ) {}

  /**
   * Where links in emails point. Defaults to local dev; every deployed environment must
   * set it, or members receive links to a machine that is not theirs.
   */
  private get ctx(): { webOrigin: string } {
    return { webOrigin: this.config.get<string>('WEB_ORIGIN') ?? 'http://localhost:3000' };
  }

  async magicLink(to: string, token: string): Promise<void> {
    await this.deliver(to, templates.magicLink(this.ctx, token));
  }

  async verificationStatus(to: string, status: string, reason: string | null): Promise<void> {
    await this.deliver(to, templates.verificationStatus(this.ctx, status, reason));
  }

  async reply(to: string, actorHandleName: string, postTitle: string, postId: string): Promise<void> {
    await this.deliver(to, templates.reply(this.ctx, actorHandleName, postTitle, postId));
  }

  async kudosReceived(
    to: string,
    targetType: 'post' | 'comment',
    postTitle: string,
    postId: string,
  ): Promise<void> {
    await this.deliver(to, templates.kudosReceived(this.ctx, targetType, postTitle, postId));
  }

  async accountNotice(
    to: string,
    event: string,
    reason: string | null,
    extra: { newHandleName?: string; actionId?: string; status?: string },
  ): Promise<void> {
    await this.deliver(to, templates.accountNotice(this.ctx, event, reason, extra));
  }

  private async deliver(to: string, body: Omit<OutboundEmail, 'to'>): Promise<void> {
    await this.provider.send({ to, ...body });
  }
}
