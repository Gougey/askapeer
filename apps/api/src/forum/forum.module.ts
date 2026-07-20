import { Module } from '@nestjs/common';
import { AppAccessGuard } from '../auth/app-access.guard';
import { JwtConfigModule } from '../auth/jwt-config.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SettingsModule } from '../settings/settings.module';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { VocabularyController } from './vocabulary.controller';
import { VocabularyService } from './vocabulary.service';

/** EPIC-C — forum posting, listing and threads (S4). Comments/kudos arrive with S5. */
@Module({
  imports: [
    JwtConfigModule, // JwtAuthGuard verifies the access token
    SettingsModule, // AppAccessGuard reads the paywall setting
  ],
  controllers: [PostsController, VocabularyController],
  providers: [PostsService, VocabularyService, JwtAuthGuard, AppAccessGuard],
})
export class ForumModule {}
