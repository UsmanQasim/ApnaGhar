import { Body, Controller, Get, Post } from '@nestjs/common';

import { PLANS, PlanCode, changePlanSchema, premiumSavingOrNull } from '@ghar/shared';

import { AgentId } from '../common/auth.guard';
import { PrismaService } from '../common/prisma.service';
import { zodBody } from '../common/zod.pipe';
import { BillingService } from './billing.service';

@Controller('billing')
export class BillingController {
  constructor(
    private readonly billing: BillingService,
    private readonly prisma: PrismaService,
  ) {}

  /** Everything the dashboard billing card needs, in one round trip. */
  @Get('summary')
  async summary(@AgentId() agentId: string) {
    const [quota, balance, subscription, openInvoice, recentSpend] = await Promise.all([
      this.billing.getQuota(agentId),
      this.billing.getBalance(agentId),
      this.prisma.subscription.findUnique({ where: { agentId } }),
      this.prisma.invoice.findFirst({
        where: { agentId, status: { in: ['open', 'due', 'partially_paid', 'overdue'] } },
        orderBy: { createdAt: 'desc' },
        include: { items: true },
      }),
      this.recentSpend(agentId, 3),
    ]);

    return {
      plan: quota.plan,
      planPricePaisa: PLANS[quota.plan].pricePaisa,
      includedListings: PLANS[quota.plan].includedListings,
      activeListings: quota.activeListings,
      slotsRemaining: Number.isFinite(quota.slotsRemaining) ? quota.slotsRemaining : null,
      nextListingFeePaisa: quota.feePaisa,
      balancePaisa: balance,
      subscription,
      openInvoice,
      recentSpendPaisa: recentSpend,
      recentCycles: 3,
      // Computed server-side from ACTUAL spend so the client cannot invent a
      // saving. Null means: show no upsell at all.
      premiumSavingPaisa:
        quota.plan === PlanCode.BASIC ? premiumSavingOrNull(recentSpend, 3) : null,
    };
  }

  @Get('invoices')
  async invoices(@AgentId() agentId: string) {
    return this.prisma.invoice.findMany({
      where: { agentId },
      orderBy: { createdAt: 'desc' },
      take: 24,
      include: { items: true, payments: { select: { id: true, status: true, amountPaisa: true } } },
    });
  }

  @Get('ledger')
  async ledger(@AgentId() agentId: string) {
    return this.prisma.ledgerEntry.findMany({
      where: { agentId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  @Post('plan')
  async changePlan(
    @AgentId() agentId: string,
    @Body(zodBody(changePlanSchema)) input: { plan: PlanCode; immediate: boolean },
  ) {
    await this.billing.changePlan(agentId, input.plan, input.immediate);
    return this.billing.getQuota(agentId);
  }

  /** Total invoiced over the last N closed cycles. Drives the honest upsell. */
  private async recentSpend(agentId: string, cycles: number): Promise<number> {
    const invoices = await this.prisma.invoice.findMany({
      where: { agentId, status: { in: ['paid', 'due', 'overdue', 'partially_paid'] } },
      orderBy: { createdAt: 'desc' },
      take: cycles,
      select: { totalPaisa: true },
    });
    return Number(invoices.reduce((acc, i) => acc + i.totalPaisa, BigInt(0)));
  }
}
