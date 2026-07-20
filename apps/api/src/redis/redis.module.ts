import { Global, Inject, Module, type OnModuleDestroy } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import IORedis, { type Redis } from 'ioredis';

export const REDIS = Symbol('REDIS');

/**
 * Shared Redis connection. Lives here rather than inside the verification module
 * because Redis is infrastructure, not one epic's concern — BullMQ (EPIC-A's worker)
 * is simply its first consumer, with rate limiting (architecture §5.3), notifications
 * and research-feed ingestion to follow. It also lets the health check probe Redis
 * without depending on an epic module.
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: REDIS,
      inject: [ConfigService],
      useFactory: (config: ConfigService): Redis =>
        new IORedis(config.get<string>('REDIS_URL') ?? 'redis://localhost:6379', {
          maxRetriesPerRequest: null, // required by BullMQ's blocking reads
        }),
    },
  ],
  exports: [REDIS],
})
export class RedisModule implements OnModuleDestroy {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async onModuleDestroy(): Promise<void> {
    this.redis.disconnect();
  }
}
