import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { ArrayMaxSize, IsArray, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import type { Request } from 'express';
import type { AuthedMember } from '../auth/jwt-auth.guard';
import { InterestsService } from './interests.service';
import { AdminAccessModule } from '../admin/admin-access.module';
import { AdminGuard } from '../admin/admin.guard';
import { AppAccessGuard } from '../auth/app-access.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FeedService } from './feed.service';
import { IngestionService } from './ingestion.service';

/**
 * The whole interest set, replaced in one call.
 *
 * Capped because a member selecting most of the taxonomy is not expressing an interest —
 * it is the same as expressing none, and it would make the feed query scan everything.
 */
export class InterestsDto {
  @IsArray()
  @ArrayMaxSize(30)
  @IsUUID('all', { each: true })
  tagIds!: string[];
}

export class FeedQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(20)
  cursor?: string;
}

/**
 * The research feed (EPIC-I §6, screens B1 and B2).
 *
 * Behind the same two gates as the forum: the feed is member-facing content on a
 * verified-only platform, so it is for approved members with an active handle. Nothing
 * here is handle-scoped *data* — the corpus is identical for everyone at this slice — but
 * the access rule is about who may read the platform, not about whose data it is.
 */
@Controller('research-feed')
@UseGuards(JwtAuthGuard, AppAccessGuard)
export class ResearchFeedController {
  constructor(
    private readonly feed: FeedService,
    private readonly interests: InterestsService,
  ) {}

  @Get()
  async list(@Query() query: FeedQueryDto, @Req() req: Request & { member: AuthedMember }) {
    const tagIds = await this.interests.tagIdsFor(req.member.handleId!);
    return this.feed.list(query.cursor, undefined, tagIds);
  }

  @Get('interests')
  myInterests(@Req() req: Request & { member: AuthedMember }) {
    return this.interests.list(req.member.handleId!);
  }

  @Put('interests')
  async setInterests(
    @Body() dto: InterestsDto,
    @Req() req: Request & { member: AuthedMember },
  ) {
    // Filter to tags that exist rather than letting a stale id take the request down on a
    // foreign key — a picker held open while an administrator retires a tag is ordinary.
    const valid = await this.interests.existingTagIds(dto.tagIds);
    return this.interests.replace(req.member.handleId!, valid);
  }

  @Get(':articleId')
  detail(@Param('articleId', new ParseUUIDPipe()) articleId: string) {
    return this.feed.detail(articleId);
  }
}

/**
 * Operating the ingest by hand — admin only.
 *
 * Separate controller because the gate is different, and a member-facing path must never
 * be one guard's mistake away from letting anyone trigger a crawl of two public APIs.
 * `run` is synchronous rather than enqueued on purpose: this exists to *watch* an ingest
 * and see what came back, which a fire-and-forget job cannot show you.
 */
@Controller('admin/research-feed')
@UseGuards(JwtAuthGuard, AdminGuard)
export class ResearchFeedAdminController {
  constructor(private readonly ingestion: IngestionService) {}

  @Get('status')
  status() {
    return this.ingestion.stats();
  }

  @Post('run')
  run() {
    return this.ingestion.runAll();
  }

  /** Re-parse stored abstracts after a markup-handling change — no refetch. */
  @Post('normalise-abstracts')
  normaliseAbstracts() {
    return this.ingestion.normaliseAbstracts();
  }

  /** Re-tag the stored corpus after a classifier or synonym change — no refetch. */
  @Post('reclassify')
  reclassify() {
    return this.ingestion.reclassifyAll();
  }
}

/** Re-exported so the module can wire the admin guard's dependencies. */
export { AdminAccessModule };
