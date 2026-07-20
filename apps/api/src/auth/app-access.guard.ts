import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { SettingsService } from '../settings/settings.service';
import type { AuthedMember } from './jwt-auth.guard';

/**
 * The two gates every in-app screen must pass (screen spec §1.2, open-questions §1.4).
 * Deliberately independent — a paid-up member who has been suspended is out, and so is a
 * member in good standing whose subscription lapsed.
 *
 * Use behind JwtAuthGuard, which populates `req.member`.
 */
@Injectable()
export class AppAccessGuard implements CanActivate {
  constructor(private readonly settings: SettingsService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<Request & { member?: AuthedMember }>();
    const member = req.member;
    if (!member) throw new ForbiddenException('Not authenticated.');

    // Gate 1 — handle/moderation. A full-scoped token is only ever minted for a member
    // with a handle whose status is `active` (AuthService.issueSession), so the claim is
    // the check. A moderator suspending mid-session takes effect when the ~15-minute
    // access token next refreshes, which EPIC-B §10 accepts as the boundary.
    if (member.scope !== 'full' || !member.handleId) {
      throw new ForbiddenException('A handle-scoped session is required.');
    }

    // Gate 2 — billing. Subscriptions arrive with S12; until the paywall is switched on
    // the platform is in the PRD's free seed period (§11) and this gate passes for
    // everyone (gap G-15). When S12 lands it fills in the branch below, and the flip
    // itself is an administrator setting change, not a deploy.
    const paywallActive = await this.settings.getBoolean('billing.paywall_active', false);
    if (paywallActive) {
      throw new ForbiddenException(
        'Subscription required. The billing gate is active but billing is not implemented until S12.',
      );
    }

    return true;
  }
}
