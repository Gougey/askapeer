import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AppAccessGuard } from '../auth/app-access.guard';
import { JwtAuthGuard, type AuthedMember } from '../auth/jwt-auth.guard';
import { ListPostsDto } from './forum.dto';
import { PostsService } from './posts.service';

/**
 * The caller's own contributions — Activity › My Q&A (screen E2, gap G-21).
 *
 * **Published only.** Drafts and `needs_correction` are equally author-private but are
 * `/v1/me/drafts`' business (EPIC-E, S9): this screen is "what I've contributed and how
 * it landed", which is a different question from "what I still owe".
 *
 * Like the notifications routes, neither endpoint takes a handle — it comes from the
 * token, so there is no shape of request that reads someone else's history here. The
 * public version of that is a handle profile (F2), which is a deliberate projection
 * rather than this list with a parameter.
 */
@Controller('me')
@UseGuards(JwtAuthGuard, AppAccessGuard)
export class MeController {
  constructor(private readonly posts: PostsService) {}

  @Get('posts')
  myPosts(@Req() req: Request & { member: AuthedMember }, @Query() query: ListPostsDto) {
    return this.posts.list(query, req.member.handleId!);
  }

  @Get('comments')
  myComments(@Req() req: Request & { member: AuthedMember }, @Query() query: ListPostsDto) {
    return this.posts.listMyComments(req.member.handleId!, query);
  }
}
