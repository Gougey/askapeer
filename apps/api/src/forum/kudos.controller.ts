import { Controller, Delete, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AppAccessGuard } from '../auth/app-access.guard';
import { JwtAuthGuard, type AuthedMember } from '../auth/jwt-auth.guard';
import { KudosService } from './kudos.service';

/**
 * EPIC-D §5. Award / retract kudos on a post or comment; each returns the target's
 * updated count and the caller's new `hasKudosed` state, so the client can settle the
 * toggle without a re-read.
 */
@Controller()
@UseGuards(JwtAuthGuard, AppAccessGuard)
export class KudosController {
  constructor(private readonly kudos: KudosService) {}

  @Post('posts/:postId/kudos')
  awardPost(
    @Req() req: Request & { member: AuthedMember },
    @Param('postId', ParseUUIDPipe) postId: string,
  ) {
    return this.kudos.award(req.member.handleId!, 'post', postId);
  }

  @Delete('posts/:postId/kudos')
  retractPost(
    @Req() req: Request & { member: AuthedMember },
    @Param('postId', ParseUUIDPipe) postId: string,
  ) {
    return this.kudos.retract(req.member.handleId!, 'post', postId);
  }

  @Post('comments/:commentId/kudos')
  awardComment(
    @Req() req: Request & { member: AuthedMember },
    @Param('commentId', ParseUUIDPipe) commentId: string,
  ) {
    return this.kudos.award(req.member.handleId!, 'comment', commentId);
  }

  @Delete('comments/:commentId/kudos')
  retractComment(
    @Req() req: Request & { member: AuthedMember },
    @Param('commentId', ParseUUIDPipe) commentId: string,
  ) {
    return this.kudos.retract(req.member.handleId!, 'comment', commentId);
  }
}
