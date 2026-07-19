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
    if (process.env.NODE_ENV !== 'production' && devToken) body.devToken = devToken;
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

  // The only route a pending (non-verified) session can reach — powers the holding page.
  @Get('verification-status')
  @UseGuards(JwtAuthGuard)
  status(@Req() req: Request & { member: AuthedMember }) {
    return this.auth.getVerificationStatus(req.member.memberId);
  }
}
