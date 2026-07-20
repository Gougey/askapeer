import {
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { IsIn, IsString, MinLength } from 'class-validator';
import type { Request } from 'express';
import { JwtAuthGuard, type AuthedMember } from '../auth/jwt-auth.guard';
import type { IdentityCheckOutcome } from './providers/identity-check';
import { VerificationService } from './verification.service';

export class SimulatedCallbackDto {
  @IsString()
  @MinLength(4)
  captureToken!: string;

  // Onfido's own result vocabulary, so the simulated path speaks the real language.
  @IsIn(['clear', 'consider', 'fail'])
  outcome!: IdentityCheckOutcome;
}

/**
 * Whether the simulated identity-check provider is active. Gated on an explicit opt-in
 * rather than merely `NODE_ENV !== 'production'`: the staging deploy runs with
 * NODE_ENV=production, so an env-only check would either disable the simulator where we
 * need it or leave it enabled where we must not have it. Same pattern as S1's
 * AUTH_DEV_MAGIC_LINK.
 */
export const simulationEnabled = (): boolean => process.env.VERIFICATION_SIMULATE === 'true';

@Controller('auth/verification')
export class VerificationController {
  constructor(private readonly verification: VerificationService) {}

  /**
   * Where the applicant completes the identity check (screen A4). Returns the capture
   * session so the web app knows whether to render the real Onfido SDK or the stand-in.
   */
  @Get('capture')
  @UseGuards(JwtAuthGuard)
  async capture(@Req() req: Request & { member: AuthedMember }) {
    const session = await this.verification.currentCapture(req.member.memberId);
    return { session, simulated: simulationEnabled() };
  }

  /** EPIC-A §12.1 (G-1/G-2) — the applicant's exit from `needs_more_info`. */
  @Post('resubmit')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  resubmit(@Req() req: Request & { member: AuthedMember }) {
    return this.verification.resubmit(req.member.memberId);
  }

  /**
   * Stands in for the Onfido webhook until an account exists. Unauthenticated by
   * design — like the real webhook it is called by "the provider", and it carries the
   * unguessable `captureToken` as its credential.
   *
   * 404s (not 403) unless VERIFICATION_SIMULATE=true, so in production this route is
   * indistinguishable from one that was never deployed.
   */
  @Post('simulated-callback')
  @HttpCode(200)
  async simulatedCallback(@Body() dto: SimulatedCallbackDto) {
    if (!simulationEnabled()) throw new NotFoundException();
    await this.verification.completeIdentityCheck(dto.captureToken, dto.outcome);
    return { received: true };
  }
}
