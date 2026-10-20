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
 * EPIC-D §5. Award / retract kudos on a post or comment; each returns the target's
 * updated count and the caller's new `hasKudosed` state, so the client can settle the
 * toggle without a re-read.
 */
@Controller()
@UseGuards(JwtAuthGuard, AppAccessGuard)
export class KudosController {
  constructor(private readonly kudos: KudosService) {}

  @Post('posts/:postId/kudos/:kind')
  awardPost(
    @Req() req: Request & { member: AuthedMember },
    @Param('postId', ParseUUIDPipe) postId: string,
    @Param('kind', KIND) kind: KudosKind,
  ) {
    return this.kudos.award(req.member.handleId!, 'post', postId, kind);
  }


  @Delete('posts/:postId/kudos/:kind')
  retractPost(
    @Req() req: Request & { member: AuthedMember },
    @Param('postId', ParseUUIDPipe) postId: string,
    @Param('kind', KIND) kind: KudosKind,
  ) {
    return this.kudos.retract(req.member.handleId!, 'post', postId, kind);
  }


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
