import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AppAccessGuard } from '../auth/app-access.guard';
import { JwtAuthGuard, type AuthedMember } from '../auth/jwt-auth.guard';
import {
  AGE_BAND_LABELS,
  ATTESTATION_TEXT,
  CASE_DISCLAIMER,
  CHECKLIST_ITEMS,
} from './case-policy';
import { AttestCaseDto, CorrectCaseDto, CreateCaseDto, SetChecklistDto, UpdateCaseDto } from './cases.dto';
import { CasesService } from './cases.service';

/**
 * EPIC-E §6 — the gated publish route for case discussions.
 *
 * Deliberately separate from `POST /v1/posts`, which hardcodes `type = 'question'`: there
 * is no request shape anywhere in the API that creates a case discussion already published.
 * The only path to `status = published` for this type is `attest`.
 */
@Controller('case-discussions')
@UseGuards(JwtAuthGuard, AppAccessGuard)
export class CasesController {
  constructor(private readonly cases: CasesService) {}

  /**
   * The checklist and attestation wording the composer must render (EPIC-E §4–§5).
   *
   * Served rather than hardcoded in the web app so there is exactly one copy of the
   * policy: a client that renders its own list could show five items while the server
   * gates on six, and the member would meet a publish button that never enables.
   */
  @Get('policy')
  policy() {
    return {
      checklist: CHECKLIST_ITEMS,
      attestationText: ATTESTATION_TEXT,
      disclaimer: CASE_DISCLAIMER,
      ageBands: AGE_BAND_LABELS,
    };
  }

  @Post()
  create(@Req() req: Request & { member: AuthedMember }, @Body() dto: CreateCaseDto) {
    return this.cases.createDraft(req.member.handleId!, dto);
  }

  @Patch(':postId')
  update(
    @Req() req: Request & { member: AuthedMember },
    @Param('postId', ParseUUIDPipe) postId: string,
    @Body() dto: UpdateCaseDto,
  ) {
    return this.cases.updateDraft(postId, req.member.handleId!, dto);
  }

  @Put(':postId/checklist')
  checklist(
    @Req() req: Request & { member: AuthedMember },
    @Param('postId', ParseUUIDPipe) postId: string,
    @Body() dto: SetChecklistDto,
  ) {
    return this.cases.setChecklist(postId, req.member.handleId!, dto);
  }

  /**
   * Correct a published case, re-attesting in the same request.
   *
   * A `POST … /correct` rather than a PATCH on the case itself, because it is not the same
   * operation as editing a draft: it carries an attestation, it only applies while the edit
   * window is open, and conflating the two would leave one route whose meaning depended on
   * the row's status.
   */
  @Post(':postId/correct')
  correct(
    @Req() req: Request & { member: AuthedMember },
    @Param('postId', ParseUUIDPipe) postId: string,
    @Body() dto: CorrectCaseDto,
  ) {
    return this.cases.correctPublished(
      postId,
      { memberId: req.member.memberId, handleId: req.member.handleId! },
      dto,
      req.ip ?? null,
    );
  }

  @Post(':postId/attest')
  attest(
    @Req() req: Request & { member: AuthedMember },
    @Param('postId', ParseUUIDPipe) postId: string,
    @Body() dto: AttestCaseDto,
  ) {
    // `memberId` is taken from the verified session and never from the body (EPIC-E §3):
    // an attestation is only worth recording if the platform, not the client, decided
    // whose identity it binds.
    return this.cases.attest(
      postId,
      { memberId: req.member.memberId, handleId: req.member.handleId! },
      dto,
      req.ip ?? null,
    );
  }
}
