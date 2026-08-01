import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AppAccessGuard } from '../auth/app-access.guard';
import { JwtAuthGuard, type AuthedMember } from '../auth/jwt-auth.guard';
import { CasesService } from './cases.service';

/**
 * `/v1/me/drafts` (gap G-8) — the caller's unfinished and sent-back cases.
 *
 * Sits under `me` alongside EPIC-C's MeController rather than under `case-discussions`
 * because it answers "what do I still owe", not "tell me about this case". Like every
 * other `me` route it takes no handle parameter: the handle comes from the token, so there
 * is no request that reads another member's drafts.
 */
@Controller('me')
@UseGuards(JwtAuthGuard, AppAccessGuard)
export class DraftsController {
  constructor(private readonly cases: CasesService) {}

  @Get('drafts')
  drafts(@Req() req: Request & { member: AuthedMember }) {
    return this.cases.listDrafts(req.member.handleId!);
  }
}
