import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { ArrayMaxSize, IsArray, IsOptional, IsString, MaxLength } from 'class-validator';
import type { Request } from 'express';
import { JwtAuthGuard, type AuthedMember } from '../auth/jwt-auth.guard';
import { AdminGuard } from './admin.guard';
import { TaxonomyService } from './taxonomy.service';

export class SynonymsDto {
  @IsArray()
  @ArrayMaxSize(24)
  @IsString({ each: true })
  @MaxLength(60, { each: true })
  synonyms!: string[];
}

/**
 * Tag-vocabulary administration (EPIC-J, screen G8) — phase one: synonyms.
 *
 * Behind the same allowlist as the rest of `/v1/admin`. EPIC-J eventually splits
 * `administrator` from `moderator` as separate JWT claims; with three founders on an email
 * allowlist that is ceremony without benefit, so it is deliberately deferred.
 */
@Controller('admin/taxonomy')
@UseGuards(JwtAuthGuard, AdminGuard)
export class TaxonomyController {
  constructor(private readonly taxonomy: TaxonomyService) {}

  @Get('tags')
  list(@Query('q') q?: string) {
    return this.taxonomy.search(q);
  }

  @Get('tags/:tagId')
  get(@Param('tagId', new ParseUUIDPipe()) tagId: string) {
    return this.taxonomy.get(tagId);
  }

  /** Dry run: what would these synonyms match? Writes nothing. */
  @Post('tags/:tagId/preview')
  preview(@Param('tagId', new ParseUUIDPipe()) tagId: string, @Body() dto: SynonymsDto) {
    return this.taxonomy.preview(tagId, dto.synonyms);
  }

  @Put('tags/:tagId/synonyms')
  setSynonyms(
    @Param('tagId', new ParseUUIDPipe()) tagId: string,
    @Body() dto: SynonymsDto,
    @Req() req: Request & { member: AuthedMember },
  ) {
    return this.taxonomy.setSynonyms(tagId, dto.synonyms, req.member.memberId);
  }

  @Get('audit')
  audit() {
    return this.taxonomy.auditLog();
  }
}
