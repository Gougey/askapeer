import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsIn,
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
/** An answer is prose, not an essay; generous enough for a worked reply. */
export const COMMENT_MAX_LENGTH = 10_000;
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
  // Any UUID version, deliberately not v4: the clinical taxonomy is seeded with
  // deterministic **uuid5** ids derived from each node's position in the tree, so a v4
  // constraint here rejects every real tag. The id's version is a seeding detail and
  // never something a post should be validated against — existence is, and the service
  // checks that against the vocabulary.
  @IsUUID('all', { each: true })
  @ArrayUnique()
  @ArrayMaxSize(MAX_TAGS_PER_POST)
  tagIds?: string[];
}

export class CreateCommentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(COMMENT_MAX_LENGTH)
  body!: string;

  /** Present → a nested reply; absent → a top-level answer (the kudos-ranked kind). */
  @IsOptional()
  @IsUUID()
  parentCommentId?: string;
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

/**
 * Follow a target (EPIC-B §8, S15).
 *
 * `targetType` is validated against `post` alone even though the column and the enum both
 * carry `handle`. S7 owns handle-follows and the personalised list that consumes them; until
 * that exists, accepting the value would let a client create rows nothing reads and no
 * screen can undo.
 */
export class CreateFollowDto {
  @IsIn(['post'])
  targetType!: 'post';

  @IsUUID()
  targetId!: string;
}
