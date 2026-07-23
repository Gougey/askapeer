import { Module } from '@nestjs/common';
import { JwtConfigModule } from '../auth/jwt-config.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminAccessModule } from './admin-access.module';
import { AdminController } from './admin.controller';
import { AdminGuard } from './admin.guard';
import { AdminService } from './admin.service';

/** Read-only admin console (S11a) — members, verification journeys, review queue, audit. */
@Module({
  imports: [
    JwtConfigModule, // JwtAuthGuard verifies the access token
    AdminAccessModule, // the allowlist check behind AdminGuard
  ],
  controllers: [AdminController],
  providers: [AdminService, JwtAuthGuard, AdminGuard],
})
export class AdminModule {}
