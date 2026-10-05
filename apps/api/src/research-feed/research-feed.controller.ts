import { Body, Controller, Delete, Get, Inject, Param, ParseUUIDPipe, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { Transform } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import type { Request } from 'express';
import type { AuthedMember } from '../auth/jwt-auth.guard';
import { FeedPreferencesService } from './feed-preferences.service';
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

/** The evidence ladder, as stored. `other` is a real value, not an absence. */
export const EVIDENCE_TYPES = [
  'systematic_review',
  'randomised_trial',
  'cohort_study',
  'case_report',
  'other',
] as const;

/** The three orderings the filter panel offers. Relevance needs a keyword; the service falls back. */
export const FEED_SORTS = ['recommended', 'newest', 'relevance'] as const;

/**
 * The Research filter panel, as URL parameters (Andrew's review item 6).
 *
 * **Filters live in the URL**, the way search's already do: a filtered feed is then
 * bookmarkable, the back button undoes a filter change, and a member can send someone
 * exactly the view they are looking at.
 */
export class FeedQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(20)
  cursor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  @IsOptional()
  @IsIn(EVIDENCE_TYPES)
  evidence?: (typeof EVIDENCE_TYPES)[number];

  /**
   * Years back from now — 1 to 5, never a pair of dates. Andrew asked for "year from/to";
   * an absolute range is wrong the moment it becomes a *standing* setting, so the control is
   * relative and resolved at query time.
   *
   * ⚠️ It cannot discriminate yet: every article in the corpus is from 2026, because the
   * ingest began in August and only fetches forward.
   */
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  @Max(5)
  years?: number;

  @IsOptional()
  @IsIn(FEED_SORTS)
  sort?: (typeof FEED_SORTS)[number];

  /**
   * "This URL is a search" — set by Apply, even when every field was left empty.
   *
   * ⚠️ **The API ignores it; the screen does not.** My Research shows nothing until something
   * is asked, so the page needs to tell an untouched visit from a deliberate Apply with no
   * criteria. It is declared here only because the validator rejects unknown parameters, and
   * a request carrying it would otherwise 400.
   */
  @IsOptional()
  @IsString()
  @MaxLength(1)
  f?: string;
}

/**
 * Saving the panel as standing settings.
 *
 * ⚠️ These **seed** the panel on a later visit; they do not run themselves. An unfiltered
 * visit to My Research is an empty screen with the panel open, by design.
 */
export class FeedPreferencesDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  query?: string;

  @IsOptional()
  @IsIn(EVIDENCE_TYPES)
  evidence?: (typeof EVIDENCE_TYPES)[number];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  periodYears?: number;

  @IsOptional()
  @IsIn(FEED_SORTS)
  sort?: (typeof FEED_SORTS)[number];
}

export class FeedSearchDto {
  @IsString()
  @MaxLength(200)
  q!: string;

  /**
   * The same tag filter the forum search takes, and for the same reason: a tag is clinical
   * vocabulary, not forum vocabulary. Articles are classified against the very same
   * taxonomy, so "everything under Achilles tendinopathy" is a question both corpora can
   * answer — it was only ever the *category* that could not cross.
   *
   * Mirrors `SearchDto`: repeated rather than comma-joined, normalised to an array, and any
   * UUID version because the taxonomy is seeded with deterministic uuid5 ids.
   */
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === undefined ? undefined : Array.isArray(value) ? value : [value],
  )
  @IsUUID('all', { each: true })
  @ArrayMaxSize(3)
  tag?: string[];

  /** Post-search refinement, applied on the results themselves. */
  @IsOptional()
  @IsIn(EVIDENCE_TYPES)
  evidence?: (typeof EVIDENCE_TYPES)[number];

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
    private readonly preferences: FeedPreferencesService,
  ) {}

  /**
   * The corpus, narrowed by whatever the filter panel asked for.
   *
   * ⚠️ **Nothing about the member reaches this.** It used to read their clinical interests
   * and rank around them; after testing, Adrian took interests out of My Research entirely.
   * Two members sending the same query get the same page, and an empty query means the whole
   * corpus rather than somebody's profile.
   *
   * The *screen*, not the API, decides that an unasked visit shows nothing: the page simply
   * does not call this until there is something to ask.
   */
  @Get()
  list(@Query() query: FeedQueryDto) {
    return this.feed.list(query.cursor, undefined, {
      query: query.q,
      evidence: query.evidence,
      periodYears: query.years,
      sort: query.sort,
    });
  }

  /** The standing criteria, used to seed the panel when the URL carries none. */
  @Get('preferences')
  myPreferences(@Req() req: Request & { member: AuthedMember }) {
    return this.preferences.get(req.member.handleId!);
  }

  @Put('preferences')
  savePreferences(@Body() dto: FeedPreferencesDto, @Req() req: Request & { member: AuthedMember }) {
    return this.preferences.save(req.member.handleId!, dto);
  }

  @Delete('preferences')
  async clearPreferences(@Req() req: Request & { member: AuthedMember }) {
    await this.preferences.clear(req.member.handleId!);
    return { cleared: true };
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
    return this.feed.search(query.q, query.cursor, undefined, query.tag ?? [], query.evidence);
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
    /*
     * **Two attempts, not five.** Resumability argued for more — an interrupted attempt
     * leaves a committed cursor, so the next one continues — and on 2026-09-23 that reasoning
     * turned a single stall into a ninety-minute outage: the run blocked the event loop, the
     * job lock could not be renewed, BullMQ judged it stalled, and the retries kept
     * re-blocking the loop until the queue was drained by hand.
     *
     * The blocking is fixed (`YIELD_EVERY` in the ingestion service), but the lesson stands:
     * a job that can take the API down with it should not be given four chances to. Two is
     * enough to ride out a machine restart, and a third failure is a signal to look rather
     * than something to automate away.
     */
    await this.queue.add(RECLASSIFY_JOB, {}, { attempts: 2 });
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
