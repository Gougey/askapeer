import { Body, Controller, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AdminGuard } from '../admin/admin.guard';
import { JwtAuthGuard, type AuthedMember } from '../auth/jwt-auth.guard';
import { IdentityAccessService } from './identity-access.service';
import { RevealIdentityDto } from './reveal-identity.dto';

/**
 * The audited reveal-identity action (EPIC-F §5, screen G3). Separate from the report
 * queue on purpose: the queue operates entirely on handle_ids, and only this explicit,
 * separately-logged POST crosses into real identity — never implicit in viewing a report.
 */
@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class IdentityAccessController {
  constructor(private readonly access: IdentityAccessService) {}

  @Post('handles/:handleId/reveal-identity')
  reveal(
    @Req() req: Request & { member: AuthedMember },
    @Param('handleId', ParseUUIDPipe) handleId: string,
    @Body() dto: RevealIdentityDto,
  ) {
    return this.access.reveal(handleId, req.member.memberId, dto);
  }
}
