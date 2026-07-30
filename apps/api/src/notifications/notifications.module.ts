import { Module } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { JwtConfigModule } from '../auth/jwt-config.module';
import { AppAccessGuard } from '../auth/app-access.guard';
import { SettingsModule } from '../settings/settings.module';

import {
  NotificationPreferencesController,
  NotificationsController,
} from './notifications.controller';
import { NotificationsQueueModule } from './notifications.queue';
import { NotificationsService } from './notifications.service';
import { NotificationsWorker } from './notifications.worker';

/**
 * EPIC-G notifications (S10).
 *
 * This module is a **consumer** of other epics' events, never a dependency of them: the
 * enqueue side lives in the global `NotificationsQueueModule`, so the forum (and later
 * moderation and verification) can announce an event without importing any of this.
 *
 * Mail itself lives in the global `EmailModule`: EPIC-A's sign-in link and pre-handle
 * status notices need it too, and routing those through this epic would be a strange
 * dependency to draw.
 */
@Module({
  imports: [
    NotificationsQueueModule,
    JwtConfigModule, // JwtAuthGuard verifies the access token
    SettingsModule, // AppAccessGuard's paywall read
  ],
  controllers: [NotificationsController, NotificationPreferencesController],
  providers: [NotificationsService, NotificationsWorker, JwtAuthGuard, AppAccessGuard],
  exports: [NotificationsService],
})
export class NotificationsModule {}
