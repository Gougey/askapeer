import { Module } from '@nestjs/common';
import { AppAccessGuard } from '../auth/app-access.guard';
import { JwtConfigModule } from '../auth/jwt-config.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SettingsModule } from '../settings/settings.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

/**
 * EPIC-F reporting (S11b) — members file reports; the moderation queue that triages them
 * lands in S11c. Same two-guard setup as ForumModule: JwtConfigModule verifies the token,
 * SettingsModule backs AppAccessGuard's paywall read.
 */
@Module({
  imports: [JwtConfigModule, SettingsModule],
  controllers: [ReportsController],
  providers: [ReportsService, JwtAuthGuard, AppAccessGuard],
})
export class ReportsModule {}
