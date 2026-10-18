import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtConfigModule } from './jwt-config.module';
import { VerificationModule } from '../verification/verification.module';
import { AdminAccessModule } from '../admin/admin-access.module';
import { SettingsModule } from '../settings/settings.module';
import { PilotAllowlistService } from './pilot-allowlist.service';

@Module({
  imports: [
    VerificationModule, // registration hands off to the verification pipeline (S2)
    JwtConfigModule,
    AdminAccessModule, // the session read reports whether the member is an admin
    SettingsModule, // the closed-pilot gate on registration
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, PilotAllowlistService],
  // EPIC-B re-issues a session when a handle is claimed; JwtConfigModule so importers
  // get the same signing config without redeclaring it.
  exports: [AuthService, JwtConfigModule],
})
export class AuthModule {}
