import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_KEY = 'askapeer:rate-limit';

/**
 * What a route is limited *by*. The architecture spec (§5.3) calls for both, and they stop
 * different attacks:
 *
 * - `ip` — one source spraying many addresses. Without it, our sign-up form is an open
 *   relay for sending mail to strangers, which is how a sending reputation dies.
 * - `email` — many sources targeting one address, i.e. mail-bombing a specific person.
 *   Keyed on the submitted address, before we know whether an account exists, so a 429
 *   cannot be used to probe which addresses are registered.
 * - `handle` — an authenticated member, for routes past sign-in (reporting).
 */
export type RateLimitDimension = 'ip' | 'email' | 'handle';

/**
 * Limits are **per dimension**, not one number shared across them, because the dimensions
 * describe populations of wildly different size. A per-email limit governs one person's
 * mailbox; a per-IP limit governs everyone behind that address — and our members work in
 * clinics and hospitals, where an entire building shares one outbound IP. Giving both the
 * same allowance either makes the email limit useless or locks out a whole department.
 */
export type RateLimitRule = {
  windowSeconds: number;
  limits: Partial<Record<RateLimitDimension, number>>;
};

/** Applies a rate limit to a route. Enforced by `RateLimitGuard`. */
export const RateLimit = (rule: RateLimitRule) => SetMetadata(RATE_LIMIT_KEY, rule);
