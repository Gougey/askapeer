import { Module } from '@nestjs/common';
import { AdminAccessModule } from '../admin/admin-access.module';
import { AdminGuard } from '../admin/admin.guard';
import { JwtConfigModule } from '../auth/jwt-config.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BadgeService } from '../forum/badge.service';
import { SettingsModule } from '../settings/settings.module';
import { ModerationController } from './moderation.controller';
import { ModerationService } from './moderation.service';

/**
 * EPIC-F moderation queue + remove/warn (S11c). Reuses the admin allowlist (AdminGuard)
 * as the moderator gate for now — the dedicated moderator role is S13. BadgeService is
 * re-provided here (it only needs the global Redis + Settings) so the kudos clawback keeps
 * the top-contributor leaderboard in step, exactly as an award/retract does.
 */
@Module({
  imports: [
    JwtConfigModule, // JwtAuthGuard verifies the token
    AdminAccessModule, // the allowlist behind AdminGuard
    SettingsModule, // BadgeService's threshold settings
  ],
  controllers: [ModerationController],
  providers: [ModerationService, BadgeService, JwtAuthGuard, AdminGuard],
})
export class ModerationModule {}
