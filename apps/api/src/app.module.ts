import { resolve } from 'node:path';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DbModule } from './db/db.module';
import { RedisModule } from './redis/redis.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { VerificationModule } from './verification/verification.module';
import { HandlesModule } from './handles/handles.module';
import { ForumModule } from './forum/forum.module';
import { CasesModule } from './cases/cases.module';
import { ReportsModule } from './reports/reports.module';
import { ModerationModule } from './moderation/moderation.module';
import { AdminModule } from './admin/admin.module';
import { ResearchFeedModule } from './research-feed/research-feed.module';
import { SettingsModule } from './settings/settings.module';
import { NotificationsModule } from './notifications/notifications.module';
import { EmailModule } from './notifications/email/email.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // The API runs with cwd = apps/api; the shared .env lives at the workspace root.
      envFilePath: [resolve(process.cwd(), '../../.env'), '.env'],
    }),
    DbModule,
    RedisModule,
    EmailModule, // outbound mail (global): sign-in links, verification and notices
    // Epic modules are added here as their slices land.
    HealthModule,
    AuthModule, // EPIC-A (S1)
    VerificationModule, // EPIC-A (S2)
    HandlesModule, // EPIC-B (S3)
    ForumModule, // EPIC-C + EPIC-D (S4, S5)
    CasesModule, // EPIC-E case discussions (S9)
    NotificationsModule, // EPIC-G (S10)
    ReportsModule, // EPIC-F reporting (S11b)
    ModerationModule, // EPIC-F moderation queue + remove/warn (S11c)
    AdminModule, // EPIC-A/F read-only admin console (S11a)
    ResearchFeedModule, // EPIC-I research feed (S8)
    SettingsModule, // EPIC-J, read side only (S3)
  ],
})
export class AppModule {}
