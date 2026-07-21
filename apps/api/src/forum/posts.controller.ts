import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AppAccessGuard } from '../auth/app-access.guard';
import { JwtAuthGuard, type AuthedMember } from '../auth/jwt-auth.guard';
import { CreatePostDto, ListPostsDto } from './forum.dto';
import { PostsService } from './posts.service';

/**
 * EPIC-C §5. Every route sits behind both gates: forum content is for verified members
 * only, and a write needs the handle-scoped token whose existence already proves the
 * handle is `active` (AppAccessGuard's gate 1).
 */
@Controller('posts')
@UseGuards(JwtAuthGuard, AppAccessGuard)
export class PostsController {
  constructor(private readonly posts: PostsService) {}

  @Post()
  create(@Req() req: Request & { member: AuthedMember }, @Body() dto: CreatePostDto) {
    return this.posts.create(req.member.handleId!, dto);
  }

  @Get()
  list(@Query() query: ListPostsDto) {
    return this.posts.list(query);
  }

  @Get(':postId')
  thread(
    @Req() req: Request & { member: AuthedMember },
    @Param('postId', ParseUUIDPipe) postId: string,
  ) {
    // The viewer's handle decides both `viewerContext.isAuthor` and whether an
    // author-private draft is visible at all (EPIC-C §13.4).
    return this.posts.getThread(postId, req.member.handleId!);
  }
}
