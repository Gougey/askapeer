import { Module } from '@nestjs/common';
import { AppAccessGuard } from '../auth/app-access.guard';
import { JwtConfigModule } from '../auth/jwt-config.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SettingsModule } from '../settings/settings.module';
import { BadgeService } from './badge.service';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';
import { KudosController } from './kudos.controller';
import { KudosService } from './kudos.service';
import { MeController } from './me.controller';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { VocabularyController } from './vocabulary.controller';
import { VocabularyService } from './vocabulary.service';

/**
 * EPIC-C forum + EPIC-D kudos (S4 + S5). Posting, listing and threads (S4); answering,
 * kudos, ranking and the top-contributor badge (S5). RedisModule is global, so the
 * badge leaderboard needs no explicit import here.
 */
@Module({
  imports: [
    JwtConfigModule, // JwtAuthGuard verifies the access token
    SettingsModule, // AppAccessGuard's paywall read + the badge threshold settings
  ],
  controllers: [
    PostsController,
    CommentsController,
    KudosController,
    VocabularyController,
    MeController,
    SearchController,
  ],
  providers: [
    PostsService,
    CommentsService,
    KudosService,
    BadgeService,
    VocabularyService,
    SearchService,
    JwtAuthGuard,
    AppAccessGuard,
  ],
  // EPIC-E (S9) reads a case discussion's thread back through the same reader questions
  // use, so the two post types stay one shape everywhere downstream.
  // PostsService: EPIC-E reads a case's thread back through the same reader questions use.
  // VocabularyService: it also resolves the case-discussion category rather than asking
  // its author to pick one (`categories.post_type`).
  exports: [PostsService, VocabularyService],
})
export class ForumModule {}
