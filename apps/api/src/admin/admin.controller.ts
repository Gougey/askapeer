import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from './admin.guard';
import { AdminService } from './admin.service';

/**
 * Read-only admin observability (S11a). Every route sits behind JwtAuthGuard + AdminGuard,
 * so it's reachable only by an allowlisted admin. The write actions (clearing the review
 * queue, moderation) are the next slice; this one is deliberately look-but-don't-touch.
 */
@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

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
}
