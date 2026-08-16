import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { DORMANT_AFTER_DAYS, SubscriptionStatus } from '@ghar/shared';

import { PrismaService } from '../common/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { BillingService } from './billing.service';

/**
 * The dunning ladder from README §2.
 *
 *   day 0    invoice due
 *   day 1-7  past_due   — full access, reminders in Urdu
 *   day 8+   restricted — listings hidden, share links dead, DATA PRESERVED
 *   day 90+  dormant    — media to cold storage, still fully restorable
 *
 * Nothing is ever deleted for non-payment. A restricted agent who comes back
 * three months later finds every listing, photo and comment exactly as he left
 * it — that recovery rate is worth far more than the storage it costs.
 */
@Injectable()
export class DunningService {
  private readonly logger = new Logger(DunningService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly billing: BillingService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Close billing cycles that have reached their end. */
  @Cron(CronExpression.EVERY_HOUR)
  async runCycleClose(): Promise<void> {
    const due = await this.prisma.subscription.findMany({
      where: {
        currentPeriodEnd: { lte: new Date() },
        status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] },
      },
      select: { agentId: true },
      take: 500,
    });

    for (const { agentId } of due) {
      try {
        await this.billing.closeCycle(agentId);
      } catch (error) {
        this.logger.error(`closeCycle failed for agent ${agentId}`, error as Error);
      }
    }
  }

  /** Reminders during the grace window. */
  @Cron(CronExpression.EVERY_DAY_AT_10AM)
  async sendReminders(): Promise<void> {
    const pastDue = await this.prisma.subscription.findMany({
      where: { status: SubscriptionStatus.PAST_DUE, graceEndsAt: { gt: new Date() } },
      select: { agentId: true, graceEndsAt: true },
      take: 1000,
    });

    for (const sub of pastDue) {
      const daysLeft = sub.graceEndsAt
        ? Math.max(0, Math.ceil((sub.graceEndsAt.getTime() - Date.now()) / 86_400_000))
        : 0;

      await this.notifications.send(sub.agentId, 'billing.grace_period', {
        days: daysLeft,
        // Deliver by SMS too — an agent who has stopped opening the app is
        // exactly the agent you need to reach.
        alsoSms: true,
      });
    }
  }

  /** Move agents past their grace window into restriction. */
  @Cron(CronExpression.EVERY_HOUR)
  async applyRestrictions(): Promise<void> {
    const expired = await this.prisma.subscription.findMany({
      where: { status: SubscriptionStatus.PAST_DUE, graceEndsAt: { lte: new Date() } },
      select: { agentId: true },
      take: 500,
    });

    for (const { agentId } of expired) {
      await this.prisma.subscription.update({
        where: { agentId },
        data: { status: SubscriptionStatus.RESTRICTED, restrictedAt: new Date() },
      });
      await this.notifications.send(agentId, 'billing.restricted', { alsoSms: true });
      this.logger.log(`Agent ${agentId} restricted (listings hidden, data preserved)`);
    }
  }

  /** Long-restricted accounts go dormant. Still nothing is deleted. */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async applyDormancy(): Promise<void> {
    const cutoff = new Date(Date.now() - DORMANT_AFTER_DAYS * 86_400_000);
    const stale = await this.prisma.subscription.findMany({
      where: { status: SubscriptionStatus.RESTRICTED, restrictedAt: { lte: cutoff } },
      select: { agentId: true },
      take: 200,
    });

    for (const { agentId } of stale) {
      await this.prisma.subscription.update({
        where: { agentId },
        data: { status: SubscriptionStatus.DORMANT },
      });
      // TODO(M6): enqueue a job to move this agent's media to cold storage.
      this.logger.log(`Agent ${agentId} marked dormant`);
    }
  }

  /**
   * Called the moment a payment settles an invoice. Restores the agent to
   * exactly where he was — no re-publishing, no re-uploading, no lost comments.
   */
  async reinstate(agentId: string): Promise<void> {
    const balance = await this.billing.getBalance(agentId);
    if (balance > BigInt(0)) return;

    await this.prisma.subscription.update({
      where: { agentId },
      data: {
        status: SubscriptionStatus.ACTIVE,
        graceEndsAt: null,
        restrictedAt: null,
      },
    });

    await this.notifications.send(agentId, 'billing.verified', {});
    this.logger.log(`Agent ${agentId} reinstated`);
  }
}
