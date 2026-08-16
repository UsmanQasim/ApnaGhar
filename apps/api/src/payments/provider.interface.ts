import type { PaymentProviderCode, PaymentStatus } from '@ghar/shared';

export interface InitiateInput {
  paymentId: string;
  agentId: string;
  invoiceId: string | null;
  amountPaisa: number;
  payerMsisdn?: string;
  description: string;
  returnUrl: string;
}

export type InitiateResult =
  | {
      /** Redirect / hosted checkout flow (JazzCash, Easypaisa, card). */
      kind: 'redirect';
      url: string;
      /** Fields to POST to `url`, when the provider requires a form post. */
      formFields?: Record<string, string>;
    }
  | {
      /** Manual rail: show instructions, wait for the agent to upload proof. */
      kind: 'instructions';
      walletNumber: string;
      accountTitle: string | null;
      amountPaisa: number;
      reference: string;
    };

export interface PaymentEvent {
  providerTxnId: string;
  status: PaymentStatus;
  amountPaisa: number | null;
  raw: unknown;
  /** False when signature/hash verification failed — never trust the payload. */
  authentic: boolean;
}

export interface PaymentProvider {
  readonly code: PaymentProviderCode;
  readonly enabled: boolean;

  initiate(input: InitiateInput): Promise<InitiateResult>;

  /** Poll/reconcile a single transaction against the provider. */
  verify(providerTxnId: string): Promise<PaymentEvent>;

  /**
   * Parse and AUTHENTICATE a provider callback. Implementations must verify the
   * response hash before returning `authentic: true`. A redirect alone is never
   * proof of payment — the browser is under the payer's control.
   */
  handleCallback(payload: Record<string, string>): Promise<PaymentEvent>;
}
