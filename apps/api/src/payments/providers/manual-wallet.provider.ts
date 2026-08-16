import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PaymentProviderCode, PaymentStatus } from '@ghar/shared';

import type {
  InitiateInput,
  InitiateResult,
  PaymentEvent,
  PaymentProvider,
} from '../provider.interface';

/**
 * Rail A — manual EasyPaisa / JazzCash transfer with admin verification.
 *
 * This ships first and costs nothing to build. The agent transfers to your
 * wallet number, uploads a screenshot and the TxID, and an admin approves it in
 * the panel. Crucially, access is unblocked OPTIMISTICALLY for 24 hours — an
 * agent who pays at 11pm should not be locked out until you wake up.
 *
 * At 100-300 agents this is entirely manageable, and it means launch does not
 * wait on merchant onboarding.
 */
@Injectable()
export class ManualWalletProvider implements PaymentProvider {
  readonly code: PaymentProviderCode;
  readonly enabled: boolean;

  constructor(
    private readonly config: ConfigService,
    code: PaymentProviderCode = PaymentProviderCode.MANUAL_EASYPAISA,
  ) {
    this.code = code;
    this.enabled = this.config.get<string>('PAYMENTS_MANUAL_ENABLED') === 'true';
  }

  private get walletNumber(): string {
    return this.code === PaymentProviderCode.MANUAL_JAZZCASH
      ? (this.config.get<string>('MANUAL_JAZZCASH_NUMBER') ?? '')
      : (this.config.get<string>('MANUAL_EASYPAISA_NUMBER') ?? '');
  }

  private get accountTitle(): string | null {
    return this.code === PaymentProviderCode.MANUAL_JAZZCASH
      ? (this.config.get<string>('MANUAL_JAZZCASH_ACCOUNT_TITLE') ?? null)
      : (this.config.get<string>('MANUAL_EASYPAISA_ACCOUNT_TITLE') ?? null);
  }

  async initiate(input: InitiateInput): Promise<InitiateResult> {
    return {
      kind: 'instructions',
      walletNumber: this.walletNumber,
      accountTitle: this.accountTitle,
      amountPaisa: input.amountPaisa,
      // The agent types this into the transfer's reference field so you can
      // match it without squinting at a screenshot.
      reference: input.paymentId.slice(0, 8).toUpperCase(),
    };
  }

  /**
   * There is nothing to poll — a human is the verifier. The payment sits in
   * `pending` until an admin approves or rejects it in the panel.
   */
  async verify(providerTxnId: string): Promise<PaymentEvent> {
    return {
      providerTxnId,
      status: PaymentStatus.PENDING,
      amountPaisa: null,
      raw: null,
      authentic: false,
    };
  }

  async handleCallback(): Promise<PaymentEvent> {
    throw new Error('manual_provider_has_no_callback');
  }
}
