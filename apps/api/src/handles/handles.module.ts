import { Module } from '@nestjs/common';
import { AppAccessGuard } from '../auth/app-access.guard';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SettingsModule } from '../settings/settings.module';
import { HandlesController } from './handles.controller';
import { HandlesService } from './handles.service';

/** EPIC-B — pseudonymous handles and profiles (S3). */
@Module({
  imports: [
    AuthModule, // handle creation mints the full session (EPIC-B §5)
    SettingsModule, // AppAccessGuard reads the paywall setting
  ],
  controllers: [HandlesController],
  providers: [HandlesService, JwtAuthGuard, AppAccessGuard],
})
export class HandlesModule {}
