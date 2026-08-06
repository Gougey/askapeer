import { Module } from '@nestjs/common';
import { AppAccessGuard } from '../auth/app-access.guard';
import { JwtConfigModule } from '../auth/jwt-config.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SettingsModule } from '../settings/settings.module';
import { BadgeService } from './badge.service';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';
import { FollowsController } from './follows.controller';
import { FollowsService } from './follows.service';
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
 * kudos and ranking (S5). RedisModule is global, so the kudos leaderboard needs no
 * explicit import here.
 *
 * Follows (S15) live here rather than in a module of their own: the write path is
 * EPIC-B's by ownership, but every read joins `posts` and returns the forum's card DTO,
 * and a separate module would import this one for both.
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
    FollowsController,
  ],
  providers: [
    PostsService,
    CommentsService,
    KudosService,
    BadgeService,
    VocabularyService,
    SearchService,
    FollowsService,
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
