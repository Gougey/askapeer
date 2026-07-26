import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard, type AuthedMember } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../admin/admin.guard';
import { ModerationActionDto } from './moderation.dto';
import { ModerationService } from './moderation.service';

/**
 * The moderation surface (EPIC-F §6, S11c) — the report queue and the action that
 * resolves a report. Sits under the same `/v1/admin` prefix and the same two guards as
 * the rest of the admin console: reachable only by an allowlisted moderator/admin. Every
 * route operates on `handle_id`s only — real identity is the separate audited reveal (S11e).
 */
@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class ModerationController {
  constructor(private readonly moderation: ModerationService) {}

  @Get('reports')
  queue(@Query('status') status?: string) {
    return this.moderation.queue(status);
  }

  @Get('reports/:reportId')
  detail(@Param('reportId', ParseUUIDPipe) reportId: string) {
    return this.moderation.getReport(reportId);
  }

  @Post('reports/:reportId/action')
  act(
    @Req() req: Request & { member: AuthedMember },
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Body() dto: ModerationActionDto,
  ) {
    return this.moderation.act(reportId, req.member.memberId, dto);
  }
}
