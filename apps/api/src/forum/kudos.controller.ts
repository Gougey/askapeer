import {
  Controller,
  Delete,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AppAccessGuard } from '../auth/app-access.guard';
import { JwtAuthGuard, type AuthedMember } from '../auth/jwt-auth.guard';
import type { KudosKind } from '../db/schema';
import { KudosService } from './kudos.service';

/** `insightful` | `useful` in the path; anything else is a 400 before the service runs. */
const KIND = new ParseEnumPipe({ insightful: 'insightful', useful: 'useful' } as const);

/**
 * EPIC-D §5. Award / retract Insightful or Useful on an **answer**; each returns the answer's
 * updated counts and the caller's per-kind state, so the client can settle the toggle without
 * a re-read.
 *
 * ⚠️ **Answers only** (Adrian and Andrew, 21 October 2026). The awards say whether something
 * helped you, which is a property of an answer; the signal for a good question is Follow —
 * "I want to know this too". The question routes were removed rather than left refusing, so a
 * stale client gets a 404, and migration 0059 took the existing awards off questions.
 */
@Controller()
@UseGuards(JwtAuthGuard, AppAccessGuard)
export class KudosController {
  constructor(private readonly kudos: KudosService) {}

  @Post('comments/:commentId/kudos/:kind')
  awardComment(
    @Req() req: Request & { member: AuthedMember },
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @Param('kind', KIND) kind: KudosKind,
  ) {
    return this.kudos.award(req.member.handleId!, 'comment', commentId, kind);
  }

  @Delete('comments/:commentId/kudos/:kind')
  retractComment(
    @Req() req: Request & { member: AuthedMember },
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @Param('kind', KIND) kind: KudosKind,
  ) {
    return this.kudos.retract(req.member.handleId!, 'comment', commentId, kind);
  }

}
