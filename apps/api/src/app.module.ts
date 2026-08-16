import path from 'node:path';

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { PaymentProviderCode } from '@ghar/shared';

import { AdminController } from './admin/admin.controller';
import { AdminService } from './admin/admin.service';
import { AgentsController } from './agents/agents.controller';
import { AgentsService } from './agents/agents.service';
import { InsightsController } from './agents/insights.controller';
import { InsightsService } from './agents/insights.service';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { OtpService } from './auth/otp.service';
import { BillingController } from './billing/billing.controller';
import { BillingService } from './billing/billing.service';
import { DunningService } from './billing/dunning.service';
import { AuthGuard } from './common/auth.guard';
import { EngagementController } from './engagement/engagement.controller';
import { EngagementService } from './engagement/engagement.service';
import { HealthController } from './common/health.controller';
import { PrismaService } from './common/prisma.service';
import { ListingsController } from './listings/listings.controller';
import { ListingsService } from './listings/listings.service';
import { MediaController } from './media/media.controller';
import { MediaService } from './media/media.service';
import { NotificationsService } from './notifications/notifications.service';
import { SmsService } from './notifications/sms.service';
import { PaymentsController } from './payments/payments.controller';
import { PaymentsService } from './payments/payments.service';
import type { PaymentProvider } from './payments/provider.interface';
import { JazzCashProvider } from './payments/providers/jazzcash.provider';
import { ManualWalletProvider } from './payments/providers/manual-wallet.provider';
import { SearchController } from './search/search.controller';
import { SearchService } from './search/search.service';
import { ShareController } from './share/share.controller';
import { ShareService } from './share/share.service';

export const PAYMENT_PROVIDERS = Symbol('PAYMENT_PROVIDERS');

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        path.resolve(__dirname, '../../../.env.local'),
        path.resolve(__dirname, '../../../.env'),
        '.env.local',
        '.env',
      ],
    }),
    ScheduleModule.forRoot(),
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: config.get<string>('JWT_ACCESS_TTL') ?? '15m' },
      }),
    }),
    // Global floor. The OTP endpoints tighten this further with @Throttle,
    // because each of those calls costs a real SMS.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
  ],
  controllers: [
    HealthController,
    AuthController,
    ListingsController,
    AgentsController,
    AdminController,
    InsightsController,
    EngagementController,
    MediaController,
    SearchController,
    BillingController,
    PaymentsController,
    ShareController,
  ],
  providers: [
    PrismaService,
    SmsService,
    NotificationsService,
    OtpService,
    AuthService,
    BillingService,
    DunningService,
    ListingsService,
    AgentsService,
    AdminService,
    InsightsService,
    EngagementService,
    MediaService,
    SearchService,
    ShareService,
    JazzCashProvider,

    // Both manual wallets share one implementation, differing only in which
    // number the agent is told to send money to.
    {
      provide: 'MANUAL_EASYPAISA_PROVIDER',
      useFactory: (config: ConfigService) =>
        new ManualWalletProvider(config, PaymentProviderCode.MANUAL_EASYPAISA),
      inject: [ConfigService],
    },
    {
      provide: 'MANUAL_JAZZCASH_PROVIDER',
      useFactory: (config: ConfigService) =>
        new ManualWalletProvider(config, PaymentProviderCode.MANUAL_JAZZCASH),
      inject: [ConfigService],
    },
    {
      provide: PAYMENT_PROVIDERS,
      useFactory: (
        easypaisa: PaymentProvider,
        jazzcashManual: PaymentProvider,
        jazzcashApi: PaymentProvider,
      ): PaymentProvider[] => [easypaisa, jazzcashManual, jazzcashApi],
      inject: ['MANUAL_EASYPAISA_PROVIDER', 'MANUAL_JAZZCASH_PROVIDER', JazzCashProvider],
    },
    {
      provide: PaymentsService,
      useFactory: (
        prisma: PrismaService,
        config: ConfigService,
        billing: BillingService,
        dunning: DunningService,
        notifications: NotificationsService,
        providers: PaymentProvider[],
      ) => new PaymentsService(prisma, config, billing, dunning, notifications, providers),
      inject: [
        PrismaService,
        ConfigService,
        BillingService,
        DunningService,
        NotificationsService,
        PAYMENT_PROVIDERS,
      ],
    },

    // Order matters: throttling runs before auth so an unauthenticated flood
    // is rejected without touching Redis or the database.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AppModule {}
