import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AppAccessGuard } from '../auth/app-access.guard';
import { JwtAuthGuard, type AuthedMember } from '../auth/jwt-auth.guard';
import { CreateReportDto } from './reports.dto';
import { ReportsService } from './reports.service';

/**
 * EPIC-F §6 — member-facing reporting. Behind both gates like the rest of the community
 * write surface: reporting is for verified members, and the handle-scoped token both
 * proves an active handle and supplies the `reporter_handle_id`.
 */
@Controller('reports')
@UseGuards(JwtAuthGuard, AppAccessGuard)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Post()
  create(@Req() req: Request & { member: AuthedMember }, @Body() dto: CreateReportDto) {
    return this.reports.create(req.member.handleId!, dto);
  }
}
