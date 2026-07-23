import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard, type AuthedMember } from '../auth/jwt-auth.guard';
import { VerificationService } from '../verification/verification.service';
import { AdminGuard } from './admin.guard';
import { VerificationDecisionDto } from './admin.dto';
import { AdminService } from './admin.service';

/**
 * Read-only admin observability (S11a). Every route sits behind JwtAuthGuard + AdminGuard,
 * so it's reachable only by an allowlisted admin. The write actions (clearing the review
 * queue, moderation) are the next slice; this one is deliberately look-but-don't-touch.
 */
@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly verification: VerificationService,
  ) {}

  @Get('members')
  members(@Query('status') status?: string) {
    return this.admin.listMembers(status);
  }

  @Get('members/:id')
  member(@Param('id', ParseUUIDPipe) id: string) {
    return this.admin.getMember(id);
  }

  @Get('review-queue')
  reviewQueue() {
    return this.admin.reviewQueue();
  }

  @Get('audit/verification')
  audit() {
    return this.admin.auditLog();
  }

  /**
   * A manual verification decision (EPIC-A §6). The admin's own member id is the
   * `decided_by` on the immutable decision row — the reviewer, not "system".
   */
  @Post('members/:id/verification-decision')
  decide(
    @Req() req: Request & { member: AuthedMember },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: VerificationDecisionDto,
  ) {
    return this.verification.recordAdminDecision(id, dto.action, req.member.memberId, dto.reason ?? null);
  }
}
