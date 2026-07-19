import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

export type AuthedMember = { memberId: string; scope: 'pending' | 'full' };

/** Verifies the Bearer access token and attaches the member to the request. */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<Request & { member?: AuthedMember }>();
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw new UnauthorizedException('Missing bearer token.');
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; scope: 'pending' | 'full' }>(header.slice(7));
      req.member = { memberId: payload.sub, scope: payload.scope };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token.');
    }
  }
}
