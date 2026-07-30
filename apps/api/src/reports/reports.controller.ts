import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AppAccessGuard } from '../auth/app-access.guard';
import { JwtAuthGuard, type AuthedMember } from '../auth/jwt-auth.guard';
import { CreateReportDto } from './reports.dto';
import { RateLimit } from '../common/rate-limit/rate-limit.decorator';
import { RateLimitGuard } from '../common/rate-limit/rate-limit.guard';
import { ReportsService } from './reports.service';

/**
 * EPIC-F §6 — member-facing reporting. Behind both gates like the rest of the community
 * write surface: reporting is for verified members, and the handle-scoped token both
 * proves an active handle and supplies the `reporter_handle_id`.
 */
@Controller('reports')
@UseGuards(JwtAuthGuard, AppAccessGuard, RateLimitGuard)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  // Per-handle (architecture spec §5.3). Reporting must stay frictionless for a member
  // who has found something genuinely wrong — several reports in a sitting is normal — but
  // a flood is either a bug or an attempt to bury the moderation queue.
  @RateLimit({ windowSeconds: 3600, limits: { handle: 20, ip: 100 } })
  @Post()
  create(@Req() req: Request & { member: AuthedMember }, @Body() dto: CreateReportDto) {
    return this.reports.create(req.member.handleId!, dto);
  }
}
