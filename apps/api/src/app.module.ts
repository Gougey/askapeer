import { resolve } from 'node:path';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DbModule } from './db/db.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // The API runs with cwd = apps/api; the shared .env lives at the workspace root.
      envFilePath: [resolve(process.cwd(), '../../.env'), '.env'],
    }),
    DbModule,
    // Epic modules are added here as their slices land.
    HealthModule,
    AuthModule, // EPIC-A (S1)
  ],
})
export class AppModule {}
