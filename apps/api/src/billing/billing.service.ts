import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import {
  EXTRA_LISTING_FEE_PAISA,
  GRACE_PERIOD_DAYS,
  PLANS,
  PlanCode,
  PropertyStatus,
  SubscriptionStatus,
  canAgentWrite,
  evaluateListingPublish,
  proratedCredit,
  type QuotaDecision,
} from '@ghar/shared';

import { PrismaService } from '../common/prisma.service';

const QUOTA_STATUSES: PropertyStatus[] = [PropertyStatus.ACTIVE, PropertyStatus.PENDING_PAYMENT];

export interface QuotaSummary extends QuotaDecision {
  plan: PlanCode;
  activeListings: number;
}

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ───────────────────────────────────────────────────────────────────────────
  // Quota
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * What would publishing one more listing cost this agent right now?
   * Read-only — safe to call from the UI on every keystroke of the create wizard.
   */
  async getQuota(agentId: string, propertyId?: string): Promise<QuotaSummary> {
    const subscription = await this.requireSubscription(agentId);

    const [activeListings, property] = await Promise.all([
      this.prisma.property.count({
        where: { agentId, status: { in: QUOTA_STATUSES } },
      }),
      propertyId
        ? this.prisma.property.findUnique({
            where: { id: propertyId },
            select: { listingFeeCharged: true },
          })
        : Promise.resolve(null),
    ]);

    const decision = evaluateListingPublish(
      { plan: subscription.planCode as PlanCode, activeListings },
      property?.listingFeeCharged ?? false,
    );

    return { ...decision, plan: subscription.planCode as PlanCode, activeListings };
  }

  /**
   * Charge (or waive) the Rs 50 for publishing a listing, inside the caller's
   * transaction. Returns the fee actually charged.
   *
   * Idempotent per property: `listingFeeCharged` plus the unique constraint on
   * (invoice_items.type, referenceId) means a double-tap on "Publish" cannot
   * bill the agent twice — the second attempt is a no-op, not a second Rs 50.
   */
  async chargeListingFee(
    tx: Prisma.TransactionClient,
    agentId: string,
    propertyId: string,
    payNow: boolean,
  ): Promise<{ feePaisa: number; invoiceId: string | null }> {
    const subscription = await tx.subscription.findUnique({ where: { agentId } });
    if (!subscription) throw new NotFoundException('subscription_not_found');
    if (!canAgentWrite(subscription.status as SubscriptionStatus)) {
      throw new ForbiddenException('subscription_restricted');
    }

    const property = await tx.property.findFirst({
      where: { id: propertyId, agentId },
      select: { id: true, listingFeeCharged: true, titleUr: true, titleEn: true },
    });
    if (!property) throw new NotFoundException('property_not_found');

    // Already paid for once — publishing again is free, forever.
    if (property.listingFeeCharged) return { feePaisa: 0, invoiceId: null };

    const activeListings = await tx.property.count({
      where: { agentId, status: { in: QUOTA_STATUSES } },
    });

    const decision = evaluateListingPublish({
      plan: subscription.planCode as PlanCode,
      activeListings,
    });

    if (decision.withinIncludedQuota) return { feePaisa: 0, invoiceId: null };

    const invoice = await this.getOrCreateOpenInvoice(tx, agentId);

    await tx.invoiceItem.create({
      data: {
        invoiceId: invoice.id,
        type: 'listing_fee',
        referenceId: propertyId,
        descriptionUr: `اضافی اشتہار — ${property.titleUr}`,
        descriptionEn: `Extra listing — ${property.titleEn ?? property.titleUr}`,
        amountPaisa: BigInt(decision.feePaisa),
      },
    });

    await tx.property.update({
      where: { id: propertyId },
      data: { listingFeeCharged: true },
    });

    await this.recalculateInvoice(tx, invoice.id);
    await this.appendLedger(tx, agentId, 'debit', decision.feePaisa, 'invoice_item', invoice.id,
      `Listing fee for ${propertyId}`);

    if (payNow) {
      await tx.invoice.update({
        where: { id: invoice.id },
        data: { status: 'due', dueAt: new Date() },
      });
    }

    return { feePaisa: decision.feePaisa, invoiceId: invoice.id };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Invoices
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * The open invoice is the agent's running tab for the current cycle. Listing
   * fees accrue into it; at cycle end it is closed, the Rs 100 subscription line
   * is added, and it becomes due. One transaction per agent per month instead of
   * eight — which matters a lot when a gateway charges a fixed fee per payment.
   */
  private async getOrCreateOpenInvoice(tx: Prisma.TransactionClient, agentId: string) {
    const existing = await tx.invoice.findFirst({
      where: { agentId, status: 'open' },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) return existing;

    const subscription = await tx.subscription.findUniqueOrThrow({ where: { agentId } });

    return tx.invoice.create({
      data: {
        agentId,
        number: await this.nextInvoiceNumber(tx),
        periodStart: subscription.currentPeriodStart,
        periodEnd: subscription.currentPeriodEnd,
        status: 'open',
      },
    });
  }

  private async nextInvoiceNumber(tx: Prisma.TransactionClient): Promise<string> {
    const year = new Date().getUTCFullYear();
    const rows = await tx.$queryRaw<Array<{ seq: bigint }>>`
      SELECT nextval('invoice_number_seq') AS seq
    `;
    const seq = rows[0]?.seq ?? BigInt(1);
    return `GHR-${year}-${String(seq).padStart(6, '0')}`;
  }

  private async recalculateInvoice(tx: Prisma.TransactionClient, invoiceId: string): Promise<void> {
    const items = await tx.invoiceItem.findMany({
      where: { invoiceId },
      select: { amountPaisa: true },
    });
    const subtotal = items.reduce((acc, i) => acc + i.amountPaisa, BigInt(0));

    const invoice = await tx.invoice.findUniqueOrThrow({
      where: { id: invoiceId },
      select: { amountPaidPaisa: true },
    });

    const status =
      subtotal <= BigInt(0)
        ? 'paid'
        : invoice.amountPaidPaisa >= subtotal
          ? 'paid'
          : invoice.amountPaidPaisa > BigInt(0)
            ? 'partially_paid'
            : undefined;

    await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        subtotalPaisa: subtotal,
        totalPaisa: subtotal,
        ...(status ? { status } : {}),
        ...(status === 'paid' ? { paidAt: new Date() } : {}),
      },
    });
  }

  /**
   * Cycle rollover, run by the billing worker. Closes the open invoice, adds the
   * subscription line, sets the due date and moves the subscription into its
   * next period.
   */
  async closeCycle(agentId: string, now = new Date()): Promise<{ invoiceId: string }> {
    return this.prisma.$transaction(async (tx) => {
      const subscription = await tx.subscription.findUniqueOrThrow({ where: { agentId } });
      const plan = PLANS[subscription.planCode as PlanCode];

      const invoice = await this.getOrCreateOpenInvoice(tx, agentId);

      // Prepaid agents (3 or 12 month bundles) skip the subscription line.
      const prepaidCovers =
        subscription.prepaidUntil !== null && subscription.prepaidUntil > subscription.currentPeriodEnd;

      if (!prepaidCovers) {
        await tx.invoiceItem.create({
          data: {
            invoiceId: invoice.id,
            type: subscription.planCode === 'premium' ? 'premium' : 'subscription',
            referenceId: null,
            descriptionUr:
              subscription.planCode === 'premium' ? 'پریمیم پلان — ماہانہ' : 'عام پلان — ماہانہ',
            descriptionEn:
              subscription.planCode === 'premium' ? 'Premium plan — monthly' : 'Basic plan — monthly',
            amountPaisa: BigInt(plan.pricePaisa),
          },
        });
        await this.appendLedger(tx, agentId, 'debit', plan.pricePaisa, 'invoice_item', invoice.id,
          'Subscription');
      }

      await this.recalculateInvoice(tx, invoice.id);

      const dueAt = new Date(now);
      const graceEndsAt = new Date(now.getTime() + GRACE_PERIOD_DAYS * 86_400_000);

      const refreshed = await tx.invoice.findUniqueOrThrow({ where: { id: invoice.id } });
      if (refreshed.totalPaisa > refreshed.amountPaidPaisa) {
        await tx.invoice.update({
          where: { id: invoice.id },
          data: { status: 'due', dueAt },
        });
      }

      const nextStart = subscription.currentPeriodEnd;
      const nextEnd = new Date(nextStart.getTime() + 30 * 86_400_000);

      await tx.subscription.update({
        where: { agentId },
        data: {
          currentPeriodStart: nextStart,
          currentPeriodEnd: nextEnd,
          status:
            refreshed.totalPaisa > refreshed.amountPaidPaisa
              ? SubscriptionStatus.PAST_DUE
              : SubscriptionStatus.ACTIVE,
          graceEndsAt: refreshed.totalPaisa > refreshed.amountPaidPaisa ? graceEndsAt : null,
        },
      });

      return { invoiceId: invoice.id };
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Plan changes
  // ───────────────────────────────────────────────────────────────────────────

  async changePlan(agentId: string, target: PlanCode, immediate: boolean): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const subscription = await tx.subscription.findUniqueOrThrow({ where: { agentId } });
      const current = subscription.planCode as PlanCode;
      if (current === target) return;

      const isUpgrade = current === PlanCode.BASIC && target === PlanCode.PREMIUM;

      // Downgrades always wait for the period boundary — otherwise an agent
      // with 15 listings would instantly blow past the basic quota mid-cycle.
      if (!isUpgrade || !immediate) {
        await tx.subscription.update({
          where: { agentId },
          data: { cancelAtPeriodEnd: false, planCode: target },
        });
        return;
      }

      const now = new Date();
      const credit = proratedCredit(
        PLANS[PlanCode.BASIC].pricePaisa,
        subscription.currentPeriodStart,
        subscription.currentPeriodEnd,
        now,
      );

      const invoice = await this.getOrCreateOpenInvoice(tx, agentId);

      if (credit > 0) {
        await tx.invoiceItem.create({
          data: {
            invoiceId: invoice.id,
            type: 'credit',
            referenceId: null,
            descriptionUr: 'عام پلان کے باقی دنوں کا رعایت',
            descriptionEn: 'Credit for unused basic plan days',
            amountPaisa: BigInt(-credit),
          },
        });
        await this.appendLedger(tx, agentId, 'credit', credit, 'credit', invoice.id,
          'Prorated basic plan credit');
      }

      await tx.invoiceItem.create({
        data: {
          invoiceId: invoice.id,
          type: 'premium',
          referenceId: null,
          descriptionUr: 'پریمیم پلان — ماہانہ',
          descriptionEn: 'Premium plan — monthly',
          amountPaisa: BigInt(PLANS[PlanCode.PREMIUM].pricePaisa),
        },
      });
      await this.appendLedger(tx, agentId, 'debit', PLANS[PlanCode.PREMIUM].pricePaisa,
        'invoice_item', invoice.id, 'Premium upgrade');

      await this.recalculateInvoice(tx, invoice.id);
      await tx.subscription.update({ where: { agentId }, data: { planCode: target } });
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Ledger
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Append-only. A DB trigger blocks UPDATE and DELETE on this table, so a
   * mistake is corrected by appending the opposite entry, never by editing.
   */
  async appendLedger(
    tx: Prisma.TransactionClient,
    agentId: string,
    direction: 'debit' | 'credit',
    amountPaisa: number,
    source: 'invoice_item' | 'payment' | 'refund' | 'credit',
    sourceId: string,
    memo?: string,
  ): Promise<void> {
    if (amountPaisa <= 0) return;

    const last = await tx.ledgerEntry.findFirst({
      where: { agentId },
      orderBy: { createdAt: 'desc' },
      select: { balanceAfterPaisa: true },
    });

    const previous = last?.balanceAfterPaisa ?? BigInt(0);
    const delta = BigInt(direction === 'debit' ? amountPaisa : -amountPaisa);

    await tx.ledgerEntry.create({
      data: {
        agentId,
        direction,
        amountPaisa: BigInt(amountPaisa),
        source,
        sourceId,
        balanceAfterPaisa: previous + delta,
        memo: memo ?? null,
      },
    });
  }

  /** Positive = the agent owes money. */
  async getBalance(agentId: string): Promise<bigint> {
    const last = await this.prisma.ledgerEntry.findFirst({
      where: { agentId },
      orderBy: { createdAt: 'desc' },
      select: { balanceAfterPaisa: true },
    });
    return last?.balanceAfterPaisa ?? BigInt(0);
  }

  // ───────────────────────────────────────────────────────────────────────────

  private async requireSubscription(agentId: string) {
    const subscription = await this.prisma.subscription.findUnique({ where: { agentId } });
    if (!subscription) throw new NotFoundException('subscription_not_found');
    return subscription;
  }

  /** Guard used by every write path an agent can reach. */
  async assertCanWrite(agentId: string): Promise<void> {
    const subscription = await this.requireSubscription(agentId);
    if (!canAgentWrite(subscription.status as SubscriptionStatus)) {
      throw new ForbiddenException('subscription_restricted');
    }
  }

  /** Sanity check used in tests and by the admin panel. */
  assertKnownFee(feePaisa: number): void {
    if (feePaisa !== 0 && feePaisa !== EXTRA_LISTING_FEE_PAISA) {
      throw new BadRequestException(`unexpected_listing_fee_${feePaisa}`);
    }
  }
}
