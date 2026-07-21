import { Body, Controller, Delete, HttpCode, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AppAccessGuard } from '../auth/app-access.guard';
import { JwtAuthGuard, type AuthedMember } from '../auth/jwt-auth.guard';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './forum.dto';

/**
 * EPIC-C §5 comment write path. Behind both gates like the rest of the forum; the
 * handle-scoped token that clears gate 1 already proves the handle is `active`, so a
 * suspended/expelled member simply can't reach here.
 */
@Controller()
@UseGuards(JwtAuthGuard, AppAccessGuard)
export class CommentsController {
  constructor(private readonly comments: CommentsService) {}

  @Post('posts/:postId/comments')
  create(
    @Req() req: Request & { member: AuthedMember },
    @Param('postId', ParseUUIDPipe) postId: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.comments.create(req.member.handleId!, postId, dto);
  }

  @Delete('comments/:commentId')
  @HttpCode(204)
  async remove(
    @Req() req: Request & { member: AuthedMember },
    @Param('commentId', ParseUUIDPipe) commentId: string,
  ) {
    await this.comments.remove(req.member.handleId!, commentId);
  }
}
