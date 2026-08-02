import { Transform } from 'class-transformer';
import { IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export const PROFESSIONAL_BODIES = ['hcpc', 'gmc', 'basrat', 'sst'] as const;
export type ProfessionalBody = (typeof PROFESSIONAL_BODIES)[number];

/**
 * Trim and lower-case an email before anything else sees it.
 *
 * The RFC says a local part *may* be case-sensitive; no mail provider anyone will sign up
 * with actually treats it that way, and members do not think of it that way either. Left
 * as typed, two real bugs follow: signing in as `Ade@x.com` after registering as
 * `ade@x.com` silently finds no member — and `requestLink` deliberately cannot say so,
 * because revealing whether an address exists is a disclosure — and registering the same
 * address in two casings creates two accounts for one person.
 *
 * Applied on the DTO rather than in the service so every route that accepts an email is
 * covered by construction, including any added later. The global ValidationPipe runs with
 * `transform: true`, so this fires before the service sees the value.
 *
 * Belt and braces: a unique index on `lower(email)` (migration 0017) makes the
 * two-accounts case impossible at the database even if some future path skips this.
 */
export const NormaliseEmail = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  );

export class RegisterDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  legalName!: string;

  @NormaliseEmail()
  @IsEmail()
  email!: string;

  // Which bodies are offered at launch is FD-1-dependent (physio-first -> hcpc); the
  // column/enum carries all four (EPIC-A §2, gap G-18).
  @IsIn(PROFESSIONAL_BODIES)
  professionalBody!: ProfessionalBody;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  registrationNumber!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2)
  registrationCountry?: string; // 'UK' only at MVP; column exists for later
}

export class RequestLinkDto {
  @NormaliseEmail()
  @IsEmail()
  email!: string;
}

export class VerifyLinkDto {
  @IsString()
  @MinLength(10)
  token!: string;
}

export class RefreshDto {
  @IsString()
  @MinLength(10)
  refreshToken!: string;
}
