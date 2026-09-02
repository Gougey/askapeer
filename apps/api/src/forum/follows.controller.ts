import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AppAccessGuard } from '../auth/app-access.guard';
import { JwtAuthGuard, type AuthedMember } from '../auth/jwt-auth.guard';
import { FollowsService } from './follows.service';
import { CreateFollowDto, ListPostsDto } from './forum.dto';

/**
 * EPIC-B §8's follow endpoints, narrowed to `target_type = post` for S15.
 *
 * The routes carry `target_type` even though only one value is accepted. Handle-following
 * is not planned (2026-08-08), but the shape costs nothing and means a second target type —
 * if one is ever wanted — is a validator change rather than a new URL.
 *
 * Like the other `/me`-shaped reads, the list takes no handle: it comes from the token, so
 * there is no request that reads someone else's subscriptions. Who follows a post is not
 * exposed anywhere (S15 §9) — it is a low-value read that would turn attention into a
 * ranking signal, which is the one thing the product reserves for kudos.
 */
@Controller()
@UseGuards(JwtAuthGuard, AppAccessGuard)
export class FollowsController {
  constructor(private readonly follows: FollowsService) {}

  @Post('follows')
  @HttpCode(HttpStatus.NO_CONTENT)
  async follow(
    @Req() req: Request & { member: AuthedMember },
    @Body() dto: CreateFollowDto,
  ): Promise<void> {
    await this.follows.followPost(req.member.handleId!, dto.targetId);
  }

  @Delete('follows/post/:targetId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unfollow(
    @Req() req: Request & { member: AuthedMember },
    @Param('targetId', ParseUUIDPipe) targetId: string,
  ): Promise<void> {
    await this.follows.unfollowPost(req.member.handleId!, targetId);
  }

  /** Activity › Following (screen E3). Threads the caller follows but did not write in. */
  @Get('me/following')
  listFollowed(@Req() req: Request & { member: AuthedMember }, @Query() query: ListPostsDto) {
    return this.follows.listFollowedPosts(req.member.handleId!, query);
  }
}
