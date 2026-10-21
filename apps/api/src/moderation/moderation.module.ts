import { Module } from '@nestjs/common';
import { AdminAccessModule } from '../admin/admin-access.module';
import { AdminGuard } from '../admin/admin.guard';
import { JwtConfigModule } from '../auth/jwt-config.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SettingsModule } from '../settings/settings.module';
import { VerificationModule } from '../verification/verification.module';
import { AppAccessGuard } from '../auth/app-access.guard';
import { IdentityAccessController } from './identity-access.controller';
import { IdentityAccessService } from './identity-access.service';
import { ModerationNoticeController } from './moderation-notice.controller';
import { ModerationNoticeService } from './moderation-notice.service';
import { ModerationController } from './moderation.controller';
import { ModerationService } from './moderation.service';

/**
 * EPIC-F moderation queue + remove/warn (S11c). Reuses the admin allowlist (AdminGuard)
 * as the moderator gate for now — the dedicated moderator role is S13. The kudos clawback
 * writes the author's totals in Postgres, which is the only place they are kept.
 */
@Module({
  imports: [
    JwtConfigModule, // JwtAuthGuard verifies the token
    AdminAccessModule, // the allowlist behind AdminGuard
    SettingsModule, // AppAccessGuard's paywall read (the member-facing moderation notice)
    VerificationModule, // expel routes the identity-status flip through the single writer
  ],
  controllers: [ModerationController, IdentityAccessController, ModerationNoticeController],
  providers: [
    ModerationService,
    IdentityAccessService,
    ModerationNoticeService,
    JwtAuthGuard,
    AdminGuard,
    AppAccessGuard,
  ],
})
export class ModerationModule {}
