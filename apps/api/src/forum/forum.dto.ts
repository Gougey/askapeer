import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export const TITLE_MAX_LENGTH = 200;
export const BODY_MAX_LENGTH = 20_000;
/** Enough to describe a presentation from several angles; few enough to stay a signal. */
export const MAX_TAGS_PER_POST = 5;

/**
 * S4 composes **questions** only. `type` is deliberately absent rather than defaulted:
 * a case discussion has to travel the EPIC-E gated route (checklist → attestation →
 * publish, S9), so accepting `type` here would open a path that skips it.
 */
export class CreatePostDto {
  @IsUUID()
  categoryId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(TITLE_MAX_LENGTH)
  title!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(BODY_MAX_LENGTH)
  body!: string;

  @IsOptional()
  @IsUUID('4', { each: true })
  @ArrayUnique()
  @ArrayMaxSize(MAX_TAGS_PER_POST)
  tagIds?: string[];
}

/**
 * List query. `cursor` is the opaque keyset cursor from the previous page's
 * `nextCursor` — offset pagination would drift as new posts land at the head.
 */
export class ListPostsDto {
  @IsOptional()
  @IsUUID()
  category?: string;

  @IsOptional()
  @IsUUID()
  tag?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
