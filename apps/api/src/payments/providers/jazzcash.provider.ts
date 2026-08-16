import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PaymentProviderCode, PaymentStatus } from '@ghar/shared';

import type {
  InitiateInput,
  InitiateResult,
  PaymentEvent,
  PaymentProvider,
} from '../provider.interface';
import {
  buildSecureHash,
  formatJazzCashTimestamp,
  isJazzCashSuccessCode,
  verifySecureHash,
} from './jazzcash.hash';

/**
 * Rail B — JazzCash direct merchant API.
 *
 * On merchant registration JazzCash issues: Merchant ID, Password, Integrity
 * Salt (hash key), and sandbox + production URLs. Requests are signed with an
 * HMAC-SHA256 over the sorted parameter values joined by '&', prefixed with the
 * salt.
 *
 * Two rules that are not optional:
 *   1. Hash generation happens HERE, on the server. Never in the app, never in
 *      a webview — shipping the integrity salt to a client hands anyone the
 *      ability to forge a "paid" response.
 *   2. A redirect back to returnUrl is NOT proof of payment. The response hash
 *      must verify, and the amount must match, before anything is marked paid.
 */
@Injectable()
export class JazzCashProvider implements PaymentProvider {
  readonly code = PaymentProviderCode.JAZZCASH_API;
  private readonly logger = new Logger(JazzCashProvider.name);

  constructor(private readonly config: ConfigService) {}

  get enabled(): boolean {
    return this.config.get<string>('JAZZCASH_ENABLED') === 'true';
  }

  private get merchantId(): string {
    return this.config.getOrThrow<string>('JAZZCASH_MERCHANT_ID');
  }

  private get password(): string {
    return this.config.getOrThrow<string>('JAZZCASH_PASSWORD');
  }

  private get integritySalt(): string {
    return this.config.getOrThrow<string>('JAZZCASH_INTEGRITY_SALT');
  }

  async initiate(input: InitiateInput): Promise<InitiateResult> {
    const now = new Date();
    const expiry = new Date(now.getTime() + 60 * 60 * 1000);

    const params: Record<string, string> = {
      pp_Version: '2.0',
      pp_TxnType: 'MWALLET',
      pp_Language: 'EN',
      pp_MerchantID: this.merchantId,
      pp_Password: this.password,
      pp_TxnRefNo: `T${formatJazzCashTimestamp(now)}${input.paymentId.slice(0, 6)}`,
      // JazzCash expects the amount in paisa as a string — which is exactly how
      // we store money, so there is no float conversion anywhere in this path.
      pp_Amount: String(input.amountPaisa),
      pp_TxnCurrency: 'PKR',
      pp_TxnDateTime: formatJazzCashTimestamp(now),
      pp_TxnExpiryDateTime: formatJazzCashTimestamp(expiry),
      pp_BillReference: input.invoiceId ?? input.paymentId,
      pp_Description: input.description.slice(0, 100),
      pp_ReturnURL: input.returnUrl,
      ppmpf_1: input.agentId,
      ppmpf_2: input.paymentId,
    };

    if (input.payerMsisdn) {
      // JazzCash wants a local 03xxxxxxxxx format, not E.164.
      params['pp_MobileNumber'] = input.payerMsisdn.replace(/^\+92/, '0');
    }

    params['pp_SecureHash'] = buildSecureHash(this.integritySalt, params);

    return {
      kind: 'redirect',
      url: this.config.getOrThrow<string>('JAZZCASH_BASE_URL'),
      formFields: params,
    };
  }

  async handleCallback(payload: Record<string, string>): Promise<PaymentEvent> {
    const authentic = verifySecureHash(this.integritySalt, payload);
    if (!authentic) {
      this.logger.warn(
        `JazzCash callback failed hash verification for txn ${payload['pp_TxnRefNo'] ?? 'unknown'}`,
      );
    }

    const success = isJazzCashSuccessCode(payload['pp_ResponseCode'] ?? '');
    const amount = Number(payload['pp_Amount'] ?? '');

    return {
      providerTxnId: payload['pp_TxnRefNo'] ?? '',
      status: authentic && success ? PaymentStatus.VERIFIED : PaymentStatus.FAILED,
      amountPaisa: Number.isFinite(amount) ? amount : null,
      raw: payload,
      authentic,
    };
  }

  /**
   * Status inquiry. Reconcile nightly against the merchant portal as well —
   * callbacks get lost, and a payment the agent made but you never recorded is
   * the single fastest way to lose his trust.
   */
  async verify(providerTxnId: string): Promise<PaymentEvent> {
    // TODO(M6): call the JazzCash Payment Inquiry endpoint once credentials
    // are issued. Left unimplemented rather than faked, so a caller cannot
    // mistake a stub for a real confirmation.
    return {
      providerTxnId,
      status: PaymentStatus.PENDING,
      amountPaisa: null,
      raw: null,
      authentic: false,
    };
  }
}
