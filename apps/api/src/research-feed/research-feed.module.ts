import { Module } from '@nestjs/common';
import { AdminAccessModule } from '../admin/admin-access.module';
import { JwtConfigModule } from '../auth/jwt-config.module';
import { SettingsModule } from '../settings/settings.module';
import { FeedService } from './feed.service';
import { IngestionQueueModule } from './ingestion.queue';
import { IngestionService } from './ingestion.service';
import { InterestsService } from './interests.service';
import { IngestionWorker } from './ingestion.worker';
import { ResearchFeedAdminController, ResearchFeedController } from './research-feed.controller';
import { ARTICLE_SOURCES } from './sources/article-source';
import { EuropePmcSource } from './sources/europe-pmc.source';
import { OpenAlexSource } from './sources/open-alex.source';

/**
 * EPIC-I — the research feed (S8).
 *
 * The sources are injected as an array behind one token, so adding Semantic Scholar or
 * Crossref later means writing an adapter and adding it to this list. Nothing in the
 * pipeline knows which source produced an article, and it must stay that way.
 */
@Module({
  imports: [
    JwtConfigModule, // JwtAuthGuard verifies the access token
    SettingsModule, // AppAccessGuard's paywall read
    AdminAccessModule, // AdminGuard on the ingest-trigger routes
    IngestionQueueModule,
  ],
  controllers: [ResearchFeedController, ResearchFeedAdminController],
  providers: [
    FeedService,
    IngestionService,
    InterestsService,
    IngestionWorker,
    EuropePmcSource,
    OpenAlexSource,
    {
      provide: ARTICLE_SOURCES,
      inject: [EuropePmcSource, OpenAlexSource],
      useFactory: (europePmc: EuropePmcSource, openAlex: OpenAlexSource) => [europePmc, openAlex],
    },
  ],
  exports: [FeedService],
})
export class ResearchFeedModule {}
