import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
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

const FACETS = ['region', 'muscle', 'structure', 'pathology'] as const;

export class AddTagDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  /** Null creates a new root region — which is what Pelvis needs. */
  @IsOptional()
  @IsUUID('all')
  parentId?: string | null;

  @IsIn(FACETS as unknown as string[])
  facet!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(24)
  @IsString({ each: true })
  synonyms?: string[];
}

export class UpdateTagDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string;

  /** Explicit null moves a tag to the root. Absent leaves the parent alone. */
  @IsOptional()
  @IsUUID('all')
  parentId?: string | null;
}

export class RetireDto {
  @IsBoolean()
  retired!: boolean;
}

export class MergeDto {
  @IsUUID('all')
  intoTagId!: string;
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

  @Post('tags')
  addTag(@Body() dto: AddTagDto, @Req() req: Request & { member: AuthedMember }) {
    return this.taxonomy.addTag(
      { name: dto.name, parentId: dto.parentId ?? null, facet: dto.facet, synonyms: dto.synonyms },
      req.member.memberId,
    );
  }

  /** Rename and/or re-parent. Refuses a move that would put a tag beneath itself. */
  @Patch('tags/:tagId')
  updateTag(
    @Param('tagId', new ParseUUIDPipe()) tagId: string,
    @Body() dto: UpdateTagDto,
    @Req() req: Request & { member: AuthedMember },
  ) {
    return this.taxonomy.updateTag(tagId, dto, req.member.memberId);
  }

  /** Retire or restore. Never deletes — existing posts keep their tags (EPIC-J §4). */
  @Post('tags/:tagId/retire')
  retire(
    @Param('tagId', new ParseUUIDPipe()) tagId: string,
    @Body() dto: RetireDto,
    @Req() req: Request & { member: AuthedMember },
  ) {
    return this.taxonomy.setRetired(tagId, dto.retired, req.member.memberId);
  }

  /** Fold this tag into another, repointing posts, articles and member interests. */
  @Post('tags/:tagId/merge')
  merge(
    @Param('tagId', new ParseUUIDPipe()) tagId: string,
    @Body() dto: MergeDto,
    @Req() req: Request & { member: AuthedMember },
  ) {
    return this.taxonomy.mergeTags(tagId, dto.intoTagId, req.member.memberId);
  }

  @Get('audit')
  audit() {
    return this.taxonomy.auditLog();
  }
}
