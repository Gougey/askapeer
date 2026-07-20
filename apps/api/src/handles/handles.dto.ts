import { IsString, MaxLength, MinLength } from 'class-validator';
import { HANDLE_MAX_LENGTH, HANDLE_MIN_LENGTH } from './handle-name';

export class CreateHandleDto {
  @IsString()
  @MinLength(HANDLE_MIN_LENGTH)
  @MaxLength(HANDLE_MAX_LENGTH)
  handleName!: string;
}

/**
 * Availability is a query param, so length is checked but the charset rule is left to
 * the service — an as-you-type caller should get `{ available: false, reason:
 * 'invalid_format' }` back rather than a 400, so the screen can show the rule inline.
 */
export class HandleAvailabilityDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;
}
