import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { ArrayMaxSize, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { AppAccessGuard } from '../auth/app-access.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SearchService } from './search.service';

export class SearchDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  q!: string;

  @IsOptional()
  @IsUUID()
  category?: string;

  /**
   * `?tag=a&tag=b` — repeated rather than comma-joined, so a tag id containing a comma
   * could never split into two. Express gives one value as a string and several as an
   * array; normalised here so the service only ever sees an array.
   *
   * Any UUID version: the taxonomy is seeded with deterministic uuid5 ids, so a v4
   * constraint would reject every real tag.
   */
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === undefined ? undefined : Array.isArray(value) ? value : [value],
  )
  @IsUUID('all', { each: true })
  @ArrayMaxSize(3)
  tag?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(20)
  cursor?: string;
}

/**
 * EPIC-C §4 search, screen C3. Behind the same two gates as the rest of the forum: search
 * reaches community content, so it is for verified members with an active handle only.
 */
@Controller('search')
@UseGuards(JwtAuthGuard, AppAccessGuard)
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Get()
  run(@Query() query: SearchDto) {
    return this.search.search({
      q: query.q,
      category: query.category,
      tags: query.tag,
      cursor: query.cursor,
    });
  }
}
