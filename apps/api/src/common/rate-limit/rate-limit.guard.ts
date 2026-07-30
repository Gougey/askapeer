import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { Redis } from 'ioredis';
import { REDIS } from '../../redis/redis.module';
import type { AuthedMember } from '../../auth/jwt-auth.guard';
import { RATE_LIMIT_KEY, type RateLimitRule } from './rate-limit.decorator';

/**
 * Redis-backed rate limiting on authentication and reporting endpoints (architecture spec
 * §5.3), which named it and left it unbuilt.
 *
 * Hand-rolled rather than `@nestjs/throttler` plus its Redis storage adapter: ioredis is
 * already here for BullMQ, the whole mechanism is an INCR and an EXPIRE, and two more
 * dependencies is a worse trade than forty lines in a repo where every dependency is a
 * supply-chain surface.
 *
 * **Fixed window, not sliding.** A fixed window lets up to 2× the limit across a boundary,
 * which is the textbook objection — and irrelevant here. This exists to stop a script
 * turning our sign-up form into a way to mail strangers, not to meter an API precisely; a
 * burst of 20 instead of 10 changes nothing about that, and a sliding window costs a
 * sorted set per key.
 *
 * **It fails open.** If Redis is unreachable the request is allowed, with a warning. The
 * limiter is a mitigation, not an authorisation boundary: locking every member out of
 * sign-in because the cache blinked is a worse outage than briefly unlimited attempts.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly log = new Logger(RateLimitGuard.name);

  constructor(
    private readonly reflector: Reflector,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const rule = this.reflector.getAllAndOverride<RateLimitRule | undefined>(RATE_LIMIT_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!rule) return true;

    const req = ctx.switchToHttp().getRequest<Request & { member?: AuthedMember }>();
    const buckets = this.bucketsFor(rule, req);
    if (buckets.length === 0) return true;

    let retryAfter = 0;
    try {
      for (const { key, limit } of buckets) {
        const count = await this.redis.incr(key);
        if (count === 1) await this.redis.expire(key, rule.windowSeconds);
        if (count > limit) {
          retryAfter = Math.max(retryAfter, await this.ttl(key, rule.windowSeconds));
        }
      }
    } catch (err) {
      this.log.warn(`Rate limiting unavailable, allowing request: ${(err as Error).message}`);
      return true;
    }

    if (retryAfter > 0) {
      // 429 with Retry-After. The message is deliberately the same whichever dimension
      // tripped — saying "too many requests for this email" would confirm the address is
      // interesting, which is exactly what the sign-in endpoint refuses to reveal.
      throw new HttpException(
        { statusCode: HttpStatus.TOO_MANY_REQUESTS, message: 'Too many requests. Please try again shortly.' },
        HttpStatus.TOO_MANY_REQUESTS,
        { description: `retry-after:${retryAfter}` },
      );
    }
    return true;
  }

  private async ttl(key: string, fallback: number): Promise<number> {
    const ttl = await this.redis.ttl(key);
    return ttl > 0 ? ttl : fallback;
  }

  /** One bucket per configured dimension. A dimension with no value contributes none. */
  private bucketsFor(
    rule: RateLimitRule,
    req: Request & { member?: AuthedMember },
  ): { key: string; limit: number }[] {
    const route = `${req.method}:${req.route?.path ?? req.path}`;
    const buckets: { key: string; limit: number }[] = [];
    for (const [dimension, limit] of Object.entries(rule.limits)) {
      if (limit === undefined) continue;
      const value = this.valueFor(dimension, req);
      if (value) buckets.push({ key: `rl:${route}:${dimension}:${value.toLowerCase()}`, limit });
    }
    return buckets;
  }

  private valueFor(
    dimension: string,
    req: Request & { member?: AuthedMember },
  ): string | undefined {
    if (dimension === 'ip') return clientIp(req);
    if (dimension === 'handle') return req.member?.handleId;
    if (dimension === 'email') {
      const email = (req.body as { email?: unknown } | undefined)?.email;
      return typeof email === 'string' && email.length > 0 ? email : undefined;
    }
    return undefined;
  }
}

/**
 * The caller's address. Behind Fly's proxy `req.ip` is the proxy, so `Fly-Client-IP` is
 * the one to trust — it is set by the platform and not forwardable by a client.
 * `X-Forwarded-For`'s first entry is the fallback for other proxies, and is client-supplied,
 * so it is a best effort rather than a guarantee.
 */
function clientIp(req: Request): string | undefined {
  const fly = req.headers['fly-client-ip'];
  if (typeof fly === 'string' && fly) return fly;
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded) return forwarded.split(',')[0]!.trim();
  return req.ip;
}
