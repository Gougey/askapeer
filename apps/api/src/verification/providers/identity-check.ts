import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';

export const IDENTITY_CHECK = Symbol('IDENTITY_CHECK');

export type IdentityCheckSessionRequest = {
  memberId: string;
  legalName: string;
};

export type IdentityCheckSession = {
  provider: string;
  /** Correlates the provider's async callback back to this check. */
  providerRef: string;
  /**
   * Where the applicant goes to complete the capture (screen A4). With the real
   * provider this carries the Onfido SDK token; simulated, it points at the
   * stand-in capture screen.
   */
  captureToken: string;
};

/** Onfido's own vocabulary — `clear` auto-approves, `consider` routes to review (§5). */
export type IdentityCheckOutcome = 'clear' | 'consider' | 'fail';

/**
 * EPIC-A §5 step B — bind the applicant's document + selfie to the claimed identity.
 *
 * Deliberately async: `createSession` returns immediately and the result arrives later
 * via callback, because that is how Onfido behaves and the architecture spec's worker
 * principle says nothing that slow blocks a request. The simulated implementation keeps
 * that shape exactly, so wiring the real provider changes this file and nothing else.
 */
export interface IdentityCheckProvider {
  createSession(req: IdentityCheckSessionRequest): Promise<IdentityCheckSession>;
}

/**
 * Simulated identity check, standing in for Onfido until an account exists.
 *
 * There is no fixture logic here on purpose: the outcome is chosen by a human on the
 * A4 stand-in capture screen, which posts it to the dev callback endpoint. That keeps
 * the async webhook path — create session, wait, resume on callback — genuinely
 * exercised rather than short-circuited, so the real integration inherits working code.
 */
@Injectable()
export class SimulatedIdentityCheck implements IdentityCheckProvider {
  async createSession(_req: IdentityCheckSessionRequest): Promise<IdentityCheckSession> {
    const ref = `sim_${randomBytes(12).toString('base64url')}`;
    return { provider: 'simulated', providerRef: ref, captureToken: ref };
  }
}
