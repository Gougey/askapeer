import { IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export const PROFESSIONAL_BODIES = ['hcpc', 'gmc', 'basrat', 'sst'] as const;
export type ProfessionalBody = (typeof PROFESSIONAL_BODIES)[number];

export class RegisterDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  legalName!: string;

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
