import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { z } from 'zod';

import {
  PaymentProviderCode,
  UserRole,
  submitManualPaymentSchema,
  verifyManualPaymentSchema,
  type SubmitManualPayment,
} from '@ghar/shared';

import { AgentId, CurrentViewer, Public, Roles } from '../common/auth.guard';
import { zodBody } from '../common/zod.pipe';
import { PaymentsService } from './payments.service';

const initiateSchema = z.object({
  provider: z.enum([PaymentProviderCode.JAZZCASH_API, PaymentProviderCode.EASYPAISA_API]),
  amountPaisa: z.number().int().positive(),
  invoiceId: z.string().uuid().nullable().default(null),
});

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly payments: PaymentsService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Which rails are live right now, plus the wallet numbers for the manual
   * flow. The app renders whatever this returns, so switching on the JazzCash
   * API later is a config change and an OTA update — no store release.
   */
  @Get('methods')
  async methods() {
    return {
      available: this.payments.availableProviders(),
      manual: {
        easypaisa: {
          number: this.config.get<string>('MANUAL_EASYPAISA_NUMBER') ?? null,
          accountTitle: this.config.get<string>('MANUAL_EASYPAISA_ACCOUNT_TITLE') ?? null,
        },
        jazzcash: {
          number: this.config.get<string>('MANUAL_JAZZCASH_NUMBER') ?? null,
          accountTitle: this.config.get<string>('MANUAL_JAZZCASH_ACCOUNT_TITLE') ?? null,
        },
      },
    };
  }

  @Post('manual')
  async submitManual(
    @AgentId() agentId: string,
    @Body(zodBody(submitManualPaymentSchema)) input: SubmitManualPayment,
  ) {
    const payment = await this.payments.submitManualPayment(agentId, input);
    return {
      id: payment.id,
      status: payment.status,
      // The agent is unblocked immediately; verification catches up later.
      provisionalUntil: payment.provisionalUntil,
    };
  }

  @Post('initiate')
  async initiate(
    @AgentId() agentId: string,
    @Body(zodBody(initiateSchema)) input: z.infer<typeof initiateSchema>,
  ) {
    return this.payments.initiateGatewayPayment(
      agentId,
      input.provider,
      input.amountPaisa,
      input.invoiceId,
    );
  }

  /**
   * Gateway callback. Public because the provider calls it, not the user —
   * authentication is the response hash, verified inside the provider. A
   * redirect alone is never treated as proof of payment.
   */
  @Public()
  @Post('jazzcash/return')
  async jazzcashReturn(@Req() request: Request) {
    const payload = request.body as Record<string, string>;
    return this.payments.handleGatewayCallback(PaymentProviderCode.JAZZCASH_API, payload);
  }

  // ── Admin verification queue ───────────────────────────────────────────────

  @Roles(UserRole.ADMIN)
  @Get('queue')
  async queue() {
    return this.payments.pendingQueue();
  }

  @Roles(UserRole.ADMIN)
  @Post('decide')
  async decide(
    @CurrentViewer() viewer: { userId: string | null },
    @Body(zodBody(verifyManualPaymentSchema))
    input: { paymentId: string; decision: 'approve' | 'reject'; reason?: string },
  ) {
    return this.payments.decideManualPayment(
      viewer.userId as string,
      input.paymentId,
      input.decision,
      input.reason,
    );
  }
}
