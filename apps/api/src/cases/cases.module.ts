import { Module } from '@nestjs/common';
import { AppAccessGuard } from '../auth/app-access.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { JwtConfigModule } from '../auth/jwt-config.module';
import { ForumModule } from '../forum/forum.module';
import { SettingsModule } from '../settings/settings.module';
import { CasesController } from './cases.controller';
import { CasesService } from './cases.service';
import { DraftsController } from './drafts.controller';

/**
 * EPIC-E — case discussions (S9).
 *
 * Depends on ForumModule for `PostsService`: a case discussion *is* a post, and its thread
 * is read back through EPIC-C's reader so a case and a question are the same object to
 * every downstream surface (list, search, kudos, moderation). Reimplementing that read
 * here would give the two types drifting shapes.
 */
@Module({
  imports: [
    JwtConfigModule, // JwtAuthGuard verifies the access token
    SettingsModule, // AppAccessGuard's paywall read
    ForumModule, // PostsService — the shared thread reader
  ],
  controllers: [CasesController, DraftsController],
  providers: [CasesService, JwtAuthGuard, AppAccessGuard],
})
export class CasesModule {}
