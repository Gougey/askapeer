import { Controller, Get, Param, ParseUUIDPipe, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AppAccessGuard } from '../auth/app-access.guard';
import { JwtAuthGuard, type AuthedMember } from '../auth/jwt-auth.guard';
import { ModerationNoticeService } from './moderation-notice.service';

/**
 * A member reading a moderation action taken against them (screen E4).
 *
 * `/me/…`, not `/admin/…`: same table, opposite direction. The admin surface reads any
 * action and shows who reported and who decided; this one reads only the caller's own and
 * shows neither.
 *
 * Note the practical limit of `AppAccessGuard` here: a **suspended or expelled** member
 * cannot pass it, so they cannot open this screen at all. That is not a gap to patch —
 * their access is precisely what was withdrawn — and it is why EPIC-G §6.1 makes the
 * account-status *email* non-optional. Email is the channel that reaches them; this
 * screen serves warnings and renames, where the member still has an app to open.
 */
@Controller('me/moderation-notices')
@UseGuards(JwtAuthGuard, AppAccessGuard)
export class ModerationNoticeController {
  constructor(private readonly notices: ModerationNoticeService) {}

  @Get(':actionId')
  get(
    @Req() req: Request & { member: AuthedMember },
    @Param('actionId', ParseUUIDPipe) actionId: string,
  ) {
    return this.notices.forHandle(actionId, req.member.handleId!);
  }
}
