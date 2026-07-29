import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AppAccessGuard } from '../auth/app-access.guard';
import { JwtAuthGuard, type AuthedMember } from '../auth/jwt-auth.guard';
import { ListNotificationsDto, UpdateNotificationPreferenceDto } from './notifications.dto';
import { NotificationsService } from './notifications.service';

/**
 * EPIC-G §8. Both gates, like every in-app surface: notifications are handle-scoped, so
 * a handle-scoped session is the minimum that can even name a recipient.
 *
 * Every route derives the handle from the token — none takes a handle as a parameter —
 * which is what makes "you can only read your own inbox" structural rather than a check
 * somebody has to remember to write.
 */
@Controller('notifications')
@UseGuards(JwtAuthGuard, AppAccessGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@Req() req: Request & { member: AuthedMember }, @Query() query: ListNotificationsDto) {
    return this.notifications.list(req.member.handleId!, query);
  }

  @Get('unread-count')
  async unreadCount(@Req() req: Request & { member: AuthedMember }) {
    return { unreadCount: await this.notifications.unreadCount(req.member.handleId!) };
  }

  @Patch(':notificationId/read')
  markRead(
    @Req() req: Request & { member: AuthedMember },
    @Param('notificationId', ParseUUIDPipe) notificationId: string,
  ) {
    return this.notifications.markRead(req.member.handleId!, notificationId);
  }

  @Post('read-all')
  @HttpCode(200)
  markAllRead(@Req() req: Request & { member: AuthedMember }) {
    return this.notifications.markAllRead(req.member.handleId!);
  }
}

/** The F4 preferences screen. Separate controller because the path is a sibling of
 *  `/notifications`, not a child of it (EPIC-G §8). */
@Controller('notification-preferences')
@UseGuards(JwtAuthGuard, AppAccessGuard)
export class NotificationPreferencesController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  get(@Req() req: Request & { member: AuthedMember }) {
    return this.notifications.getPreferences(req.member.handleId!);
  }

  @Put()
  update(
    @Req() req: Request & { member: AuthedMember },
    @Body() dto: UpdateNotificationPreferenceDto,
  ) {
    return this.notifications.setPreference(req.member.handleId!, dto);
  }
}
