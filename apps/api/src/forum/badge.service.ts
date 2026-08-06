import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { REDIS } from '../redis/redis.module';
import { SettingsService } from '../settings/settings.service';

/**
 * A Redis sorted set of every handle keyed by `kudos_total` (EPIC-D §6). Postgres stays
 * authoritative — this is a derived, rebuildable read-accelerator so the top-contributor
 * badge check doesn't run `ORDER BY kudos_total DESC` over the whole table on every
 * thread view.
 */
const LEADERBOARD_KEY = 'kudos:leaderboard';

/**
 * Defaults chosen so a small seed-period community awards **no** badges: with a floor of
 * 50, nobody qualifies until real kudos volume exists, which is the intended behaviour
 * (EPIC-D §6 — "a tiny early community doesn't hand out badges trivially"). Both are
 * tunable without a deploy via `config.settings` (EPIC-J), overridable once the real
 * kudos distribution is known.
 */
const DEFAULT_PERCENTILE = 0.01; // top 1% of active handles
const DEFAULT_MIN_KUDOS = 50; // ...but never below this floor

@Injectable()
export class BadgeService {
  private readonly log = new Logger(BadgeService.name);

  constructor(
    @Inject(REDIS) private readonly redis: Redis,
    private readonly settings: SettingsService,
  ) {}

  /**
   * Keep the leaderboard in step with the authoritative total. Called inside the same
   * request that wrote `kudos_total`, but deliberately *not* inside its DB transaction:
   * Redis isn't transactional with Postgres, and a failed cache update must never fail a
   * kudos award. A missed update self-heals on the next write, and Postgres can rebuild
   * the set wholesale if it ever drifts.
   */
  async setScore(handleId: string, kudosTotal: number): Promise<void> {
    try {
      await this.redis.zadd(LEADERBOARD_KEY, kudosTotal, handleId);
    } catch (err) {
      this.log.warn(`Leaderboard update failed for ${handleId}: ${String(err)}`);
    }
  }

  /**
   * Currently unread: the top-contributor badge was withdrawn from the API and the UI
   * pending a product decision on whether standing is shown at all, and in what form.
   * Kept — with the leaderboard still maintained above — so reinstating it is a matter of
   * calling this again rather than rebuilding the machinery.
   *
   * Which of these handles currently qualify for the top-contributor badge. Batched
   * because a thread or list renders several authors at once, and the threshold (rank +
   * floor) only needs one `ZCARD` for the whole set.
   *
   * A cold or unreachable Redis yields no badges rather than an error — the badge is a
   * display shorthand, and its absence is never worth failing a read over.
   */
  async qualifying(handleIds: string[]): Promise<Set<string>> {
    const badged = new Set<string>();
    const unique = [...new Set(handleIds)];
    if (unique.length === 0) return badged;

    try {
      const [percentile, minKudos, total] = await Promise.all([
        this.settings.getNumber('badge.top_contributor_percentile', DEFAULT_PERCENTILE),
        this.settings.getNumber('badge.top_contributor_min_kudos', DEFAULT_MIN_KUDOS),
        this.redis.zcard(LEADERBOARD_KEY),
      ]);
      if (total === 0) return badged;

      // How many places from the top count as "top contributor" — at least one once any
      // handle clears the floor, so the very top handle can badge in a small community.
      const cutoffRank = Math.max(1, Math.ceil(total * percentile));

      await Promise.all(
        unique.map(async (handleId) => {
          const [rank, score] = await Promise.all([
            this.redis.zrevrank(LEADERBOARD_KEY, handleId),
            this.redis.zscore(LEADERBOARD_KEY, handleId),
          ]);
          // zrevrank is 0-based: rank 0 is the highest total.
          if (rank !== null && rank < cutoffRank && Number(score) >= minKudos) {
            badged.add(handleId);
          }
        }),
      );
    } catch (err) {
      this.log.warn(`Badge check failed, returning no badges: ${String(err)}`);
    }
    return badged;
  }
}
