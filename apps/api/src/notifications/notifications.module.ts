import { Module } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { JwtConfigModule } from '../auth/jwt-config.module';
import { AppAccessGuard } from '../auth/app-access.guard';
import { SettingsModule } from '../settings/settings.module';
import { EmailSender } from './email.sender';
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
 * `EmailSender` is exported because it is the platform's single outbound-mail seam, and
 * EPIC-A's pre-handle status email (which by definition has no notification row to hang
 * off — §4) has to reach it too.
 */
@Module({
  imports: [
    NotificationsQueueModule,
    JwtConfigModule, // JwtAuthGuard verifies the access token
    SettingsModule, // AppAccessGuard's paywall read
  ],
  controllers: [NotificationsController, NotificationPreferencesController],
  providers: [NotificationsService, NotificationsWorker, EmailSender, JwtAuthGuard, AppAccessGuard],
  exports: [NotificationsService, EmailSender],
})
export class NotificationsModule {}
