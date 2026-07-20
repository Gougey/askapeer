import { Injectable } from '@nestjs/common';
import type { ProfessionalBody } from '../../auth/auth.dto';

export const REGISTER_LOOKUP = Symbol('REGISTER_LOOKUP');

export type RegisterLookupQuery = {
  professionalBody: ProfessionalBody;
  registrationNumber: string;
  registrationCountry: string;
  legalName: string;
};

export type RegisterLookupResult = {
  /** Maps straight onto `verification_evidence.outcome`. */
  outcome: 'pass' | 'fail' | 'needs_review';
  /** Goes into `verification_evidence.source` — which register answered. */
  source: string;
  /** Verbatim provider response, stored as `raw_result` for the audit trail. */
  raw: Record<string, unknown>;
};

/**
 * EPIC-A §5 step A — query the professional body's public register by registration
 * number and fuzzy-match the legal name.
 *
 * Implementations must never throw for an unreachable register: a register being down
 * is a `needs_review` outcome routing to the admin queue (§8), not a job failure that
 * leaves the applicant in limbo.
 */
export interface RegisterLookupProvider {
  lookup(query: RegisterLookupQuery): Promise<RegisterLookupResult>;
}

/**
 * Simulated register lookup, used until HCPC is wired (S2 backlog note). Outcome is
 * derived from the registration number so every branch of the §5 decision table is
 * reachable deterministically in dev, staging and tests:
 *
 *   ...ends 8  -> fail          (number not found on the register)
 *   ...ends 9  -> needs_review  (register unavailable / ambiguous name match)
 *   otherwise  -> pass
 *
 * BASRAT and SST return `needs_review` unconditionally regardless of the number —
 * that is not simulation, it is the real MVP rule (§5, §8: no public API exists for
 * either body, so their applicants always route to manual review). That rule survives
 * the swap to the real provider.
 */
@Injectable()
export class SimulatedRegisterLookup implements RegisterLookupProvider {
  async lookup(query: RegisterLookupQuery): Promise<RegisterLookupResult> {
    const source = `simulated:${query.professionalBody}`;

    if (query.professionalBody === 'basrat' || query.professionalBody === 'sst') {
      return {
        outcome: 'needs_review',
        source,
        raw: {
          simulated: true,
          reason: 'no_public_api',
          note: 'BASRAT/SST publish a register-check page but no API — always manual review (EPIC-A §5).',
        },
      };
    }

    const last = query.registrationNumber.trim().slice(-1);
    const outcome = last === '8' ? 'fail' : last === '9' ? 'needs_review' : 'pass';

    return {
      outcome,
      source,
      raw: {
        simulated: true,
        registrationNumber: query.registrationNumber,
        matchedName: outcome === 'pass' ? query.legalName : null,
        reason:
          outcome === 'fail'
            ? 'registration_number_not_found'
            : outcome === 'needs_review'
              ? 'register_unavailable'
              : 'name_and_number_matched',
      },
    };
  }
}
