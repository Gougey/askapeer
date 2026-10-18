import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { AdminAccessService } from '../admin/admin-access.service';
import { DRIZZLE, type Database } from '../db/db.module';
import { pilotAllowlist } from '../db/schema';
import { SettingsService } from '../settings/settings.service';

/** The `config.settings` key that turns the closed pilot on (migration 0056). */
export const PILOT_GATE_SETTING = 'access.pilot_allowlist_active';

/**
 * What registration does with an applicant.
 *
 * - `open` — no pilot running: the ordinary verification pipeline (EPIC-A §5).
 * - `pilot` — invited: approved on registration, with a decision row saying so.
 * - `closed` — not invited: refused.
 */
export type Admission = 'open' | 'pilot' | 'closed';

/**
 * The rule, kept pure so `npm run verify:pilot -w apps/api` can pin it.
 *
 * ⚠️ **Fails closed.** If the gate is on and the applicant is neither invited nor an admin,
 * the answer is `closed`. An admin is always admitted, so the founders can register before
 * the list has been imported (or after a clear-down emptied everything else).
 */
export function admission(input: { gateActive: boolean; onList: boolean; isAdmin: boolean }): Admission {
  if (!input.gateActive) return 'open';
  return input.onList || input.isAdmin ? 'pilot' : 'closed';
}

/**
 * The closed pilot's gate on registration (October 2026, Andrew's colleagues).
 *
 * While verification is simulated, this is the platform's real access control — see migration
 * 0056 for why. The list holds email addresses only, never names, and lives in the database
 * rather than the repo because the repo is public.
 */
@Injectable()
export class PilotAllowlistService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly settings: SettingsService,
    private readonly adminAccess: AdminAccessService,
  ) {}

  async admissionFor(email: string): Promise<Admission> {
    const normalised = email.trim().toLowerCase();
    const gateActive = await this.settings.getBoolean(PILOT_GATE_SETTING, false);
    if (!gateActive) return 'open';
    const [row] = await this.db
      .select({ email: pilotAllowlist.email })
      .from(pilotAllowlist)
      .where(eq(pilotAllowlist.email, normalised));
    return admission({
      gateActive,
      onList: Boolean(row),
      isAdmin: this.adminAccess.isAdminEmail(normalised),
    });
  }
}
