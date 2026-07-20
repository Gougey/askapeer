import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

/**
 * The signing configuration every module that mints or verifies an access token shares.
 *
 * Extracted because three modules now need it (auth, verification, handles) and a token
 * signed with one secret but verified against another fails in a way that looks like an
 * expiry bug. One definition, imported.
 */
@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') ?? 'dev-insecure-secret-change-me',
        signOptions: { issuer: 'askapeer' },
      }),
    }),
  ],
  exports: [JwtModule],
})
export class JwtConfigModule {}
