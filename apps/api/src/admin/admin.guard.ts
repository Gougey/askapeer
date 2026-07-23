import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthedMember } from '../auth/jwt-auth.guard';
import { AdminAccessService } from './admin-access.service';

/**
 * Gate for every `/v1/admin` route. Use behind JwtAuthGuard, which populates
 * `req.member`; this then checks the member's email against the allowlist. Membership is
 * resolved per request (not baked into the token) so adding or removing an admin takes
 * effect without waiting for a token to expire.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly access: AdminAccessService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<Request & { member?: AuthedMember }>();
    if (!req.member) throw new ForbiddenException('Not authenticated.');
    if (!(await this.access.isAdmin(req.member.memberId))) {
      throw new ForbiddenException('Admin access required.');
    }
    return true;
  }
}
