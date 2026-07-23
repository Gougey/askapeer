import { Module } from '@nestjs/common';
import { AdminAccessService } from './admin-access.service';

/**
 * Just the "who is an admin?" check, isolated so both AuthModule (reporting `isAdmin` on
 * the session) and AdminModule (the guard) can depend on it without a cycle.
 */
@Module({
  providers: [AdminAccessService],
  exports: [AdminAccessService],
})
export class AdminAccessModule {}
