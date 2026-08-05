import { Module } from '@nestjs/common';
import { JwtConfigModule } from '../auth/jwt-config.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { VerificationModule } from '../verification/verification.module';
import { AdminAccessModule } from './admin-access.module';
import { EmailTestController } from './email-test.controller';
import { TaxonomyController } from './taxonomy.controller';
import { TaxonomyService } from './taxonomy.service';
import { AdminController } from './admin.controller';
import { AdminGuard } from './admin.guard';
import { AdminService } from './admin.service';

/**
 * Admin console (S11a) — read-only members / verification journeys / review queue /
 * audit, plus the manual verification review actions (approve / reject / request info).
 */
@Module({
  imports: [
    JwtConfigModule, // JwtAuthGuard verifies the access token
    AdminAccessModule, // the allowlist check behind AdminGuard
    VerificationModule, // the review decision reuses the verification state machine
  ],
  controllers: [AdminController, EmailTestController, TaxonomyController],
  providers: [AdminService, TaxonomyService, JwtAuthGuard, AdminGuard],
})
export class AdminModule {}
