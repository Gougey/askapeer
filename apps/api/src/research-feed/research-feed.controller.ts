import { Body, Controller, Get, Inject, Param, ParseUUIDPipe, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import type { Queue } from 'bullmq';
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
import { INGESTION_QUEUE, RECLASSIFY_JOB } from './ingestion.queue';

/**
 * The whole interest set, replaced in one call.
 *
 * The cap was 30 and that was arbitrary — it only ever existed to stop someone selecting
 * the entire taxonomy, which expresses the same thing as selecting nothing. In practice it
 * bit immediately: Andrew's own criteria needed eight separate chips for "quadriceps",
 * because the taxonomy has no node meaning that, and the limit was reached before the list
 * was finished. Raised to 100, which is still far short of "everything" and no longer
 * something a real member meets. Subtree expansion also means broad areas now cost one
 * selection rather than a dozen.
 */
export class InterestsDto {
  @IsArray()
  @ArrayMaxSize(100)
  @IsUUID('all', { each: true })
  tagIds!: string[];
}

export class FeedQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(20)
  cursor?: string;
}

export class FeedSearchDto {
  @IsString()
  @MaxLength(200)
  q!: string;

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
    return this.feed.list(query.cursor, undefined, tagIds, req.member.handleId!);
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

  /**
   * Search the corpus (S16).
   *
   * **Declared above `:articleId` deliberately.** Nest matches routes in declaration order,
   * so with these the other way round `/research-feed/search` is read as an article id and
   * `ParseUUIDPipe` rejects it with a 400 — a confusing failure for a route that exists.
   *
   * Not scoped to the member's interests: the reason to type a word is usually that it is
   * outside what you already follow.
   */
  @Get('search')
  search(@Query() query: FeedSearchDto) {
    return this.feed.search(query.q, query.cursor);
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
  constructor(
    private readonly ingestion: IngestionService,
    @Inject(INGESTION_QUEUE) private readonly queue: Queue,
  ) {}

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

  /**
   * Re-tag the stored corpus after a classifier or synonym change — no refetch.
   *
   * **Queued, not awaited, and `run` above is the contrast that explains why.** That one is
   * synchronous on purpose: an ingest is something you watch, and it returns what came back
   * from each source. This takes over two minutes on the current corpus, which is longer
   * than Fly's proxy will hold a connection open — the work completed and the caller got a
   * dropped socket, so the admin screen reported a failure for a job that had in fact
   * succeeded. Enqueuing returns immediately and the screen's own numbers show the progress,
   * which is the honest version of what the caller wanted to know.
   */
  @Post('reclassify')
  async reclassify() {
    await this.queue.add(RECLASSIFY_JOB, {});
    return { queued: true };
  }

  /**
   * Which tags never match anything — the ranked worklist for synonym work.
   *
   * Separate from `status`, which is about the ingest. This is about the *vocabulary*, and it
   * is the report that turns "add synonyms" from an unbounded task into a queue ordered by
   * who is waiting.
   */
  @Get('coverage')
  coverage() {
    return this.ingestion.coverage();
  }
}

/** Re-exported so the module can wire the admin guard's dependencies. */
export { AdminAccessModule };
