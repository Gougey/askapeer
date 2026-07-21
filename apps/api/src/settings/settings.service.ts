import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../db/db.module';
import { settings } from '../db/schema';

/** How long a read is trusted before hitting the DB again. */
const CACHE_TTL_MS = 30_000;

/**
 * Reads tunable platform settings from `config.settings` (EPIC-J §4).
 *
 * Cached briefly rather than read per request: these are changed by an administrator
 * every so often, but read on the hot path of every gated request. A short TTL means an
 * admin's change takes effect within seconds without a deploy or a restart, which is the
 * whole reason these live in a table (EPIC-J) instead of the environment.
 *
 * The admin *write* path (screen G10) lands with S13; this slice only reads.
 */
@Injectable()
export class SettingsService {
  private readonly cache = new Map<string, { value: string | null; expiresAt: number }>();

  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async get(key: string): Promise<string | null> {
    const hit = this.cache.get(key);
    if (hit && hit.expiresAt > Date.now()) return hit.value;
    const [row] = await this.db
      .select({ value: settings.value })
      .from(settings)
      .where(eq(settings.key, key));
    const value = row?.value ?? null;
    this.cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
    return value;
  }

  /** Falls back to `fallback` when the key is absent or isn't a recognisable boolean. */
  async getBoolean(key: string, fallback: boolean): Promise<boolean> {
    const raw = (await this.get(key))?.trim().toLowerCase();
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    return fallback;
  }

  /** Falls back to `fallback` when the key is absent or isn't a finite number. */
  async getNumber(key: string, fallback: number): Promise<number> {
    const raw = (await this.get(key))?.trim();
    if (raw === undefined || raw === '') return fallback;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
}
