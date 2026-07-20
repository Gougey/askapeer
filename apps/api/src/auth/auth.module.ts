import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtConfigModule } from './jwt-config.module';
import { VerificationModule } from '../verification/verification.module';

@Module({
  imports: [
    VerificationModule, // registration hands off to the verification pipeline (S2)
    JwtConfigModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard],
  // EPIC-B re-issues a session when a handle is claimed; JwtConfigModule so importers
  // get the same signing config without redeclaring it.
  exports: [AuthService, JwtConfigModule],
})
export class AuthModule {}
