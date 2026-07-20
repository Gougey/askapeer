import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IDENTITY_CHECK, SimulatedIdentityCheck } from './providers/identity-check';
import { REGISTER_LOOKUP, SimulatedRegisterLookup } from './providers/register-lookup';
import { StatusChangeNotifier } from './status-change.notifier';
import { VerificationController } from './verification.controller';
import { VerificationQueueModule } from './verification.queue';
import { VerificationService } from './verification.service';
import { VerificationWorker } from './verification.worker';

/**
 * EPIC-A verification (S2).
 *
 * Both external checks sit behind interfaces with simulated implementations. Swapping
 * in HCPC and Onfido is a change to these two provider bindings — nothing in the
 * service, worker, controller or web app moves.
 */
@Module({
  imports: [
    VerificationQueueModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') ?? 'dev-insecure-secret-change-me',
        signOptions: { issuer: 'askapeer' },
      }),
    }),
  ],
  controllers: [VerificationController],
  providers: [
    VerificationService,
    VerificationWorker,
    StatusChangeNotifier,
    JwtAuthGuard,
    { provide: REGISTER_LOOKUP, useClass: SimulatedRegisterLookup },
    { provide: IDENTITY_CHECK, useClass: SimulatedIdentityCheck },
  ],
  exports: [VerificationService],
})
export class VerificationModule {}
