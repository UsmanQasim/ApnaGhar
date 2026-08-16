import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  MANUAL_PROVIDERS,
  PaymentProviderCode,
  PaymentStatus,
  type SubmitManualPayment,
} from '@ghar/shared';

import { BillingService } from '../billing/billing.service';
import { DunningService } from '../billing/dunning.service';
import { PrismaService } from '../common/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import type { PaymentProvider } from './provider.interface';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly billing: BillingService,
    private readonly dunning: DunningService,
    private readonly notifications: NotificationsService,
    private readonly providers: PaymentProvider[],
  ) {}

  private provider(code: PaymentProviderCode): PaymentProvider {
    const provider = this.providers.find((p) => p.code === code);
    if (!provider) throw new BadRequestException(`unknown_provider_${code}`);
    if (!provider.enabled) throw new BadRequestException(`provider_disabled_${code}`);
    return provider;
  }

  /** Which rails the app should offer right now. */
  availableProviders(): PaymentProviderCode[] {
    return this.providers.filter((p) => p.enabled).map((p) => p.code);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Manual rail
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * The agent has transferred and uploaded proof. We create a PENDING payment
   * and unblock him optimistically for 24 hours.
   *
   * The optimism is deliberate: the cost of a rare bad actor getting a free day
   * is far lower than the cost of every honest agent being locked out overnight
   * waiting for a human to click approve.
   */
  async submitManualPayment(agentId: string, input: SubmitManualPayment) {
    if (!MANUAL_PROVIDERS.includes(input.provider)) {
      throw new BadRequestException('not_a_manual_provider');
    }

    const duplicate = await this.prisma.payment.findFirst({
      where: { provider: input.provider, providerTxnId: input.providerTxnId },
    });
    if (duplicate) throw new ConflictException('transaction_id_already_submitted');

    const provisionalHours = Number(
      this.config.get<string>('MANUAL_PAYMENT_PROVISIONAL_HOURS') ?? '24',
    );

    const payment = await this.prisma.payment.create({
      data: {
        agentId,
        invoiceId: input.invoiceId ?? null,
        amountPaisa: BigInt(input.amountPaisa),
        provider: input.provider,
        providerTxnId: input.providerTxnId,
        payerMsisdn: input.payerMsisdn,
        proofKey: input.proofKey,
        status: PaymentStatus.PENDING,
        provisionalUntil: new Date(Date.now() + provisionalHours * 3_600_000),
      },
    });

    // Optimistic unblock: a restricted agent gets his listings back immediately.
    await this.prisma.subscription.updateMany({
      where: { agentId, status: { in: ['restricted', 'past_due'] } },
      data: { status: 'past_due', graceEndsAt: payment.provisionalUntil },
    });

    await this.notifications.send(agentId, 'billing.pendingVerification', {});
    this.logger.log(`Manual payment ${payment.id} submitted by agent ${agentId}`);

    return payment;
  }

  /**
   * Admin decision from the verification queue. Approval writes the ledger
   * entry and settles the invoice; rejection reverts to past_due with a reason
   * the agent actually sees, in Urdu.
   */
  async decideManualPayment(
    adminId: string,
    paymentId: string,
    decision: 'approve' | 'reject',
    reason?: string,
  ) {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('payment_not_found');
    if (payment.status !== PaymentStatus.PENDING) {
      throw new ConflictException('payment_already_decided');
    }

    if (decision === 'reject') {
      await this.prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: paymentId },
          data: {
            status: PaymentStatus.FAILED,
            verifiedById: adminId,
            verifiedAt: new Date(),
            rejectionReason: reason ?? null,
            provisionalUntil: null,
          },
        });
        await tx.adminAuditLog.create({
          data: {
            adminId,
            action: 'payment.reject',
            entity: 'payment',
            entityId: paymentId,
            after: { reason: reason ?? null },
          },
        });
      });

      await this.notifications.send(payment.agentId, 'billing.rejected', {
        reason: reason ?? '',
        alsoSms: true,
      });
      return { status: PaymentStatus.FAILED };
    }

    await this.settle(paymentId, adminId);
    return { status: PaymentStatus.VERIFIED };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Settlement (shared by manual approval and gateway callbacks)
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Apply a verified payment: allocate it to the invoice, append the ledger
   * credit, and reinstate the agent if he now owes nothing.
   *
   * Idempotent — settling the same payment twice is a no-op, because the ledger
   * has a unique constraint on (source, sourceId, direction) and the payment
   * status guard short-circuits.
   */
  async settle(paymentId: string, verifiedById: string | null): Promise<void> {
    const agentId = await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUniqueOrThrow({ where: { id: paymentId } });
      if (payment.status === PaymentStatus.VERIFIED) return payment.agentId;

      await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.VERIFIED,
          verifiedById,
          verifiedAt: new Date(),
          provisionalUntil: null,
        },
      });

      // Allocate to the named invoice, else to the oldest unpaid one.
      const invoice = payment.invoiceId
        ? await tx.invoice.findUnique({ where: { id: payment.invoiceId } })
        : await tx.invoice.findFirst({
            where: { agentId: payment.agentId, status: { in: ['due', 'overdue', 'partially_paid'] } },
            orderBy: { createdAt: 'asc' },
          });

      if (invoice) {
        const paid = invoice.amountPaidPaisa + payment.amountPaisa;
        await tx.invoice.update({
          where: { id: invoice.id },
          data: {
            amountPaidPaisa: paid,
            status: paid >= invoice.totalPaisa ? 'paid' : 'partially_paid',
            paidAt: paid >= invoice.totalPaisa ? new Date() : null,
          },
        });
      }

      await this.billing.appendLedger(
        tx,
        payment.agentId,
        'credit',
        Number(payment.amountPaisa),
        'payment',
        payment.id,
        `Payment via ${payment.provider}`,
      );

      if (verifiedById) {
        await tx.adminAuditLog.create({
          data: {
            adminId: verifiedById,
            action: 'payment.approve',
            entity: 'payment',
            entityId: paymentId,
            after: { amountPaisa: payment.amountPaisa.toString() },
          },
        });
      }

      return payment.agentId;
    });

    await this.dunning.reinstate(agentId);
    await this.notifications.send(agentId, 'billing.verified', {});
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Gateway rail
  // ───────────────────────────────────────────────────────────────────────────

  async initiateGatewayPayment(
    agentId: string,
    providerCode: PaymentProviderCode,
    amountPaisa: number,
    invoiceId: string | null,
  ) {
    const provider = this.provider(providerCode);

    const payment = await this.prisma.payment.create({
      data: {
        agentId,
        invoiceId,
        amountPaisa: BigInt(amountPaisa),
        provider: providerCode,
        status: PaymentStatus.PENDING,
      },
    });

    const result = await provider.initiate({
      paymentId: payment.id,
      agentId,
      invoiceId,
      amountPaisa,
      description: 'Ghar listing fees and subscription',
      returnUrl: this.config.getOrThrow<string>('JAZZCASH_RETURN_URL'),
    });

    return { paymentId: payment.id, ...result };
  }

  /**
   * Gateway callback. Three checks before anything is marked paid:
   *   1. the response hash verifies (the payload is really from the provider)
   *   2. we know this transaction
   *   3. the amount matches what we asked for
   *
   * A redirect that fails any of these is logged and ignored.
   */
  async handleGatewayCallback(
    providerCode: PaymentProviderCode,
    payload: Record<string, string>,
  ): Promise<{ ok: boolean; reason?: string }> {
    const provider = this.provider(providerCode);
    const event = await provider.handleCallback(payload);

    if (!event.authentic) {
      this.logger.warn(`Rejected inauthentic ${providerCode} callback`);
      return { ok: false, reason: 'hash_verification_failed' };
    }

    const paymentId = payload['ppmpf_2'];
    const payment = paymentId
      ? await this.prisma.payment.findUnique({ where: { id: paymentId } })
      : null;

    if (!payment) {
      this.logger.warn(`${providerCode} callback for unknown payment ${paymentId ?? '(none)'}`);
      return { ok: false, reason: 'unknown_payment' };
    }

    if (event.amountPaisa !== null && BigInt(event.amountPaisa) !== payment.amountPaisa) {
      this.logger.error(
        `${providerCode} amount mismatch on payment ${payment.id}: ` +
          `expected ${payment.amountPaisa}, got ${event.amountPaisa}`,
      );
      return { ok: false, reason: 'amount_mismatch' };
    }

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { providerTxnId: event.providerTxnId, rawPayload: payload },
    });

    if (event.status !== PaymentStatus.VERIFIED) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.FAILED },
      });
      return { ok: false, reason: 'provider_declined' };
    }

    await this.settle(payment.id, null);
    return { ok: true };
  }

  /** Admin queue: payments awaiting a human decision, oldest first. */
  async pendingQueue(limit = 50) {
    return this.prisma.payment.findMany({
      where: { status: PaymentStatus.PENDING, provider: { in: [...MANUAL_PROVIDERS] } },
      orderBy: { createdAt: 'asc' },
      take: limit,
      include: {
        agent: { include: { user: { select: { name: true, phone: true } } } },
        invoice: { select: { number: true, totalPaisa: true } },
      },
    });
  }
}
