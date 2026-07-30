import { Global, Inject, Logger, Module, type OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EMAIL_PROVIDER, LoggingEmailProvider, type EmailProvider } from './email-provider';
import { EmailSender } from './email.sender';

/**
 * Outbound mail.
 *
 * `@Global()` because mail is infrastructure with several unrelated callers — EPIC-A's
 * sign-in link and pre-handle verification notices, EPIC-G's notification worker — and
 * routing them all through one epic's module would be an odd dependency to draw.
 *
 * **The provider is chosen by config, and the only implementation today is the logger.**
 * Adding a real one (SES per the architecture spec §6, or Postmark) is a class in this
 * directory plus a branch below; every call site is already the production path, exactly
 * as the verification providers are structured.
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: EMAIL_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService): EmailProvider => {
        const kind = config.get<string>('EMAIL_PROVIDER') ?? 'log';
        switch (kind) {
          // case 'ses': return new SesEmailProvider(config);
          // case 'postmark': return new PostmarkEmailProvider(config);
          default:
            return new LoggingEmailProvider();
        }
      },
    },
    EmailSender,
  ],
  exports: [EmailSender, EMAIL_PROVIDER],
})
export class EmailModule implements OnModuleInit {
  private readonly log = new Logger(EmailModule.name);

  constructor(@Inject(EMAIL_PROVIDER) private readonly provider: EmailProvider) {}

  /**
   * Say so, loudly, when a real environment is silently sending nothing.
   *
   * A stub that logs is the right default and has carried the whole notification path so
   * far. What it must never do is go unnoticed in an environment with real members, where
   * "no email arrived" looks identical to "the feature is broken" — and where the one
   * member who most needs a message (someone suspended, who cannot open the app) is the
   * one who silently gets nothing.
   */
  onModuleInit(): void {
    if (this.provider instanceof LoggingEmailProvider && process.env.NODE_ENV === 'production') {
      this.log.warn(
        'EMAIL_PROVIDER is unset — mail is being LOGGED, NOT SENT. ' +
          'Members receive no sign-in links and no account notices.',
      );
    }
  }
}
