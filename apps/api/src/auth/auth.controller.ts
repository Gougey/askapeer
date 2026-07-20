import { Body, Controller, Get, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { RefreshDto, RegisterDto, RequestLinkDto, VerifyLinkDto } from './auth.dto';
import { JwtAuthGuard, type AuthedMember } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  // Register -> creates a pending member; no session is issued (auth is via magic link).
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  // Always 200 (never reveal whether the email exists). In dev the token is returned
  // so the flow is testable before email delivery (S10) lands.
  @Post('request-link')
  @HttpCode(200)
  async requestLink(@Body() dto: RequestLinkDto) {
    const { devToken } = await this.auth.requestLink(dto.email);
    const body: { sent: true; devToken?: string } = { sent: true };
    // Surfaced in local dev, or on the Fly staging env (AUTH_DEV_MAGIC_LINK=true) so the
    // flow is demoable before real email delivery lands (S10). Never in real production.
    const exposeDevLink =
      process.env.NODE_ENV !== 'production' || process.env.AUTH_DEV_MAGIC_LINK === 'true';
    if (exposeDevLink && devToken) body.devToken = devToken;
    return body;
  }

  @Post('verify-link')
  @HttpCode(200)
  verifyLink(@Body() dto: VerifyLinkDto) {
    return this.auth.verifyLink(dto.token);
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
