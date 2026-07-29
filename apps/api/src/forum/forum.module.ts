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
  ],
  providers: [
    PostsService,
    CommentsService,
    KudosService,
    BadgeService,
    VocabularyService,
    JwtAuthGuard,
    AppAccessGuard,
  ],
})
export class ForumModule {}
