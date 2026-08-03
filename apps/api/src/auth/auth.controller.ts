import { Body, Controller, Get, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { RefreshDto, RegisterDto, RequestLinkDto, VerifyCodeDto, VerifyLinkDto } from './auth.dto';
import { JwtAuthGuard, type AuthedMember } from './jwt-auth.guard';
import { RateLimit } from '../common/rate-limit/rate-limit.decorator';
import { RateLimitGuard } from '../common/rate-limit/rate-limit.guard';

/**
 * Rate limits here are the difference between a sign-up form and an open relay: both
 * `register` and `request-link` cause us to send mail to an address the caller chose
 * (architecture spec §5.3). Limits are generous for a human and useless for a script.
 */
@Controller('auth')
@UseGuards(RateLimitGuard)
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  // Register -> creates a pending member; no session is issued (auth is via magic link).
  // Registration is a once-ever act for a real person, so this can be tight.
  @RateLimit({ windowSeconds: 3600, limits: { ip: 20, email: 5 } })
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  // Always 200 (never reveal whether the email exists). In dev the token is returned
  // so the flow is testable before email delivery (S10) lands.
  // Per-email as well as per-IP: the per-email limit is what stops one address being
  // mail-bombed from many sources, and it applies before we know whether the account
  // exists, so a 429 reveals nothing.
  @RateLimit({ windowSeconds: 900, limits: { ip: 100, email: 10 } })
  @Post('request-link')
  @HttpCode(200)
  async requestLink(@Body() dto: RequestLinkDto) {
    const { devToken } = await this.auth.requestLink(dto.email);
    const body: { sent: true; devToken?: string } = { sent: true };
    // Local dev only in practice. AUTH_DEV_MAGIC_LINK was removed from the Fly staging
    // config once real delivery landed — while it was set, anyone who knew an address
    // could obtain a working sign-in token for it. The env check is kept because the
    // *mechanism* is still how local dev avoids needing a mailbox; the flag being absent
    // everywhere deployed is the point.
    const exposeDevLink =
      process.env.NODE_ENV !== 'production' || process.env.AUTH_DEV_MAGIC_LINK === 'true';
    if (exposeDevLink && devToken) body.devToken = devToken;
    return body;
  }

  // Guessing a 32-byte token is not feasible, but a limit costs nothing and turns a
  // brute-force attempt into something visible rather than merely futile.
  @RateLimit({ windowSeconds: 900, limits: { ip: 100 } })
  @Post('verify-link')
  @HttpCode(200)
  verifyLink(@Body() dto: VerifyLinkDto) {
    return this.auth.verifyLink(dto.token);
  }

  /**
   * Sign in with the emailed code.
   *
   * Rate-limited harder than the link path, and per email as well as per IP: six digits is
   * a million combinations, and while five wrong guesses burn the pending sign-in, nothing
   * else would stop someone requesting a fresh code and trying five more, forever.
   */
  @RateLimit({ windowSeconds: 900, limits: { ip: 30, email: 10 } })
  @Post('verify-code')
  @HttpCode(200)
  verifyCode(@Body() dto: VerifyCodeDto) {
    return this.auth.verifyCode(dto.email, dto.code);
  }

  @Post('refresh')
  @HttpCode(200)
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  // Reachable with a pending session — powers the holding page, and tells the web app
  // which onboarding step (A6 handle / A7 setup) the member still owes.
  @Get('verification-status')
  @UseGuards(JwtAuthGuard)
  status(@Req() req: Request & { member: AuthedMember }) {
    return this.auth.getVerificationStatus(req.member.memberId);
  }

  /**
   * Onboarding step A7 (gap G-13) — records that the member has read and accepted the
   * zero-tolerance anonymity rule. Kept on the auth controller because it writes to
   * `identity.members`, which is EPIC-A's table, not EPIC-B's.
   */
  @Post('anonymity-acknowledgement')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  acknowledgeAnonymity(@Req() req: Request & { member: AuthedMember }) {
    return this.auth.acknowledgeAnonymity(req.member.memberId);
  }
}
