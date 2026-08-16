import { Injectable, NotFoundException } from '@nestjs/common';

import {
  PaymentStatus,
  PropertyStatus,
  PropertyType,
  UserStatus,
  type PropertyPurpose,
} from '@ghar/shared';

import { PrismaService } from '../common/prisma.service';

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

/** Percentage change, or null when the previous window was empty. */
function delta(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * The overview tiles.
   *
   * Each tile carries its own 30-day-over-30-day delta rather than a headline
   * total alone: "Rs 4.5 crore" tells an operator nothing, "Rs 4.5 crore, up
   * 12.5%" tells them whether to act today.
   */
  async overview() {
    const [now30, prev30] = [daysAgo(30), daysAgo(60)];

    const [
      revenueNow,
      revenuePrev,
      pendingAmount,
      pendingPrev,
      activeAgents,
      activeAgentsPrev,
      newListings,
      newListingsPrev,
      pendingPayments,
      recentListings,
      recentAgents,
      recentPayments,
    ] = await Promise.all([
      this.sumPayments(PaymentStatus.VERIFIED, now30, null),
      this.sumPayments(PaymentStatus.VERIFIED, prev30, now30),
      this.sumPayments(PaymentStatus.PENDING, null, null),
      this.sumPayments(PaymentStatus.PENDING, prev30, now30),
      this.prisma.agent.count({ where: { user: { status: UserStatus.ACTIVE } } }),
      this.prisma.agent.count({ where: { createdAt: { lt: now30 }, user: { status: UserStatus.ACTIVE } } }),
      this.prisma.property.count({ where: { publishedAt: { gte: now30 } } }),
      this.prisma.property.count({ where: { publishedAt: { gte: prev30, lt: now30 } } }),

      this.prisma.payment.findMany({
        where: { status: PaymentStatus.PENDING },
        orderBy: { createdAt: 'asc' },
        take: 5,
        select: {
          id: true,
          amountPaisa: true,
          createdAt: true,
          agent: { select: { agencyName: true, user: { select: { name: true } } } },
        },
      }),

      this.prisma.property.findMany({
        where: { publishedAt: { not: null } },
        orderBy: { publishedAt: 'desc' },
        take: 4,
        select: { id: true, titleUr: true, city: true, locality: true, publishedAt: true },
      }),
      this.prisma.agent.findMany({
        orderBy: { createdAt: 'desc' },
        take: 4,
        select: { userId: true, createdAt: true, user: { select: { name: true } } },
      }),
      this.prisma.payment.findMany({
        where: { status: PaymentStatus.VERIFIED },
        orderBy: { verifiedAt: 'desc' },
        take: 4,
        select: { id: true, verifiedAt: true, invoice: { select: { number: true } } },
      }),
    ]);

    return {
      tiles: {
        revenuePaisa: revenueNow,
        revenueDelta: delta(revenueNow, revenuePrev),
        pendingPaisa: pendingAmount,
        pendingDelta: delta(pendingAmount, pendingPrev),
        activeAgents,
        activeAgentsDelta: activeAgents - activeAgentsPrev,
        newListings,
        newListingsDelta: newListings - newListingsPrev,
      },
      pendingPayments: pendingPayments.map((payment) => ({
        id: payment.id,
        amountPaisa: payment.amountPaisa.toString(),
        createdAt: payment.createdAt,
        agentName: payment.agent.user.name ?? payment.agent.agencyName ?? null,
      })),
      activity: [
        ...recentListings.map((item) => ({
          kind: 'listing' as const,
          at: item.publishedAt,
          label: item.titleUr,
          detail: [item.locality, item.city].filter(Boolean).join('، '),
        })),
        ...recentAgents.map((item) => ({
          kind: 'agent' as const,
          at: item.createdAt,
          label: item.user.name ?? '',
          detail: null,
        })),
        ...recentPayments.map((item) => ({
          kind: 'payment' as const,
          at: item.verifiedAt,
          label: item.invoice?.number ?? '',
          detail: null,
        })),
      ]
        .filter((entry): entry is typeof entry & { at: Date } => entry.at !== null)
        .sort((a, b) => b.at.getTime() - a.at.getTime())
        .slice(0, 8),
    };
  }

  private async sumPayments(
    status: PaymentStatus,
    from: Date | null,
    to: Date | null,
  ): Promise<number> {
    const result = await this.prisma.payment.aggregate({
      _sum: { amountPaisa: true },
      where: {
        status,
        ...(from || to
          ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lt: to } : {}) } }
          : {}),
      },
    });
    return Number(result._sum.amountPaisa ?? 0);
  }

  /**
   * Agent list for the management table.
   *
   * Revenue per agent is summed from VERIFIED payments only. Counting pending
   * manual transfers here would show an operator money that may never arrive,
   * and this table is what they use to decide who to chase.
   */
  async agents(query: { q?: string; verified?: boolean; suspended?: boolean }) {
    const agents = await this.prisma.agent.findMany({
      where: {
        ...(query.verified !== undefined ? { isVerified: query.verified } : {}),
        ...(query.suspended !== undefined
          ? { user: { status: query.suspended ? UserStatus.SUSPENDED : UserStatus.ACTIVE } }
          : {}),
        ...(query.q
          ? {
              OR: [
                { agencyName: { contains: query.q, mode: 'insensitive' as const } },
                { user: { name: { contains: query.q, mode: 'insensitive' as const } } },
                { user: { phone: { contains: query.q } } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        userId: true,
        agencyName: true,
        isVerified: true,
        city: true,
        ratingAvg: true,
        ratingCount: true,
        createdAt: true,
        user: { select: { name: true, phone: true, status: true } },
        _count: { select: { properties: true } },
      },
    });

    const revenue = await this.prisma.payment.groupBy({
      by: ['agentId'],
      where: {
        status: PaymentStatus.VERIFIED,
        agentId: { in: agents.map((agent) => agent.userId) },
      },
      _sum: { amountPaisa: true },
    });
    const byAgent = new Map(revenue.map((row) => [row.agentId, Number(row._sum.amountPaisa ?? 0)]));

    return agents.map((agent) => ({
      ...agent,
      listingCount: agent._count.properties,
      revenuePaisa: byAgent.get(agent.userId) ?? 0,
    }));
  }

  /** Verify or un-verify. Recorded in the audit log — this grants a trust badge. */
  async setAgentVerified(adminId: string, agentId: string, verified: boolean) {
    const before = await this.prisma.agent.findUnique({
      where: { userId: agentId },
      select: { isVerified: true },
    });
    if (!before) throw new NotFoundException('agent_not_found');

    const after = await this.prisma.agent.update({
      where: { userId: agentId },
      data: { isVerified: verified, ...(verified ? { cnicVerifiedAt: new Date() } : {}) },
      select: { userId: true, isVerified: true },
    });

    await this.audit(adminId, 'agent.set_verified', 'agent', agentId, before, after);
    return after;
  }

  /**
   * Suspend or reinstate.
   *
   * Suspension is on the USER, not the agent record, so it also blocks sign-in
   * — a suspended agent whose listings are hidden but who can still log in and
   * post more is not suspended in any useful sense.
   */
  async setAgentStatus(adminId: string, agentId: string, status: UserStatus) {
    const before = await this.prisma.user.findUnique({
      where: { id: agentId },
      select: { status: true },
    });
    if (!before) throw new NotFoundException('agent_not_found');

    const after = await this.prisma.user.update({
      where: { id: agentId },
      data: { status },
      select: { id: true, status: true },
    });

    await this.audit(adminId, 'agent.set_status', 'user', agentId, before, after);
    return after;
  }

  async listings(query: {
    city?: string;
    purpose?: PropertyPurpose;
    type?: PropertyType;
    status?: PropertyStatus;
  }) {
    return this.prisma.property.findMany({
      where: {
        ...(query.city ? { city: query.city } : {}),
        ...(query.purpose ? { purpose: query.purpose } : {}),
        ...(query.type ? { type: query.type } : {}),
        ...(query.status ? { status: query.status } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        titleUr: true,
        purpose: true,
        type: true,
        status: true,
        visibility: true,
        pricePaisa: true,
        priceVisibility: true,
        city: true,
        locality: true,
        viewCount: true,
        createdAt: true,
        media: { where: { position: 0 }, take: 1, select: { thumbnailUrl: true, kind: true } },
        agent: { select: { userId: true, agencyName: true, user: { select: { name: true } } } },
      },
    });
  }

  /**
   * Take a listing down (or put it back).
   *
   * `archived` rather than a hard delete: the listing is evidence if the agent
   * disputes the decision, and the Rs 50 already charged against it must stay
   * traceable in the ledger.
   */
  async setListingStatus(adminId: string, propertyId: string, status: PropertyStatus) {
    const before = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: { status: true },
    });
    if (!before) throw new NotFoundException('property_not_found');

    const after = await this.prisma.property.update({
      where: { id: propertyId },
      data: { status },
      select: { id: true, status: true },
    });

    await this.audit(adminId, 'listing.set_status', 'property', propertyId, before, after);
    return after;
  }


  /**
   * Platform reports.
   *
   * Revenue is bucketed by month from VERIFIED payments. The mock shows three
   * subscription plans; there are two (README §2), so the breakdown is derived
   * from PlanCode rather than a hardcoded list — a chart that invents a
   * "Standard plan" is worse than no chart.
   */
  async reports(months: number) {
    const since = new Date();
    since.setMonth(since.getMonth() - months);
    since.setDate(1);
    since.setHours(0, 0, 0, 0);

    const [revenueByMonth, planCounts, cityCounts, topAgents] = await Promise.all([
      this.prisma.$queryRaw<Array<{ month: Date; total: bigint }>>`
        SELECT date_trunc('month', "createdAt") AS month, SUM("amountPaisa")::bigint AS total
        FROM payments
        WHERE status = 'verified' AND "createdAt" >= ${since}
        GROUP BY 1
        ORDER BY 1 ASC
      `,
      this.prisma.subscription.groupBy({
        by: ['planCode'],
        _count: { _all: true },
      }),
      this.prisma.property.groupBy({
        by: ['city'],
        where: { status: PropertyStatus.ACTIVE },
        _count: { _all: true },
        orderBy: { _count: { city: 'desc' } },
        take: 6,
      }),
      this.prisma.property.groupBy({
        by: ['agentId'],
        where: { status: { in: [PropertyStatus.SOLD, PropertyStatus.RENTED] } },
        _count: { _all: true },
        orderBy: { _count: { agentId: 'desc' } },
        take: 5,
      }),
    ]);

    const agentIds = topAgents.map((row) => row.agentId);
    const [agents, agentRevenue] = await Promise.all([
      this.prisma.agent.findMany({
        where: { userId: { in: agentIds } },
        select: {
          userId: true,
          agencyName: true,
          ratingAvg: true,
          user: { select: { name: true } },
        },
      }),
      this.prisma.payment.groupBy({
        by: ['agentId'],
        where: { status: PaymentStatus.VERIFIED, agentId: { in: agentIds } },
        _sum: { amountPaisa: true },
      }),
    ]);

    const byId = new Map(agents.map((agent) => [agent.userId, agent]));
    const revenueById = new Map(
      agentRevenue.map((row) => [row.agentId, Number(row._sum.amountPaisa ?? 0)]),
    );

    return {
      revenueByMonth: revenueByMonth.map((row) => ({
        month: row.month.toISOString().slice(0, 7),
        totalPaisa: Number(row.total),
      })),
      planBreakdown: planCounts.map((row) => ({
        plan: row.planCode,
        count: row._count._all,
      })),
      listingsByCity: cityCounts.map((row) => ({ city: row.city, count: row._count._all })),
      topAgents: topAgents.map((row) => ({
        agentId: row.agentId,
        name: byId.get(row.agentId)?.user.name ?? null,
        agencyName: byId.get(row.agentId)?.agencyName ?? null,
        ratingAvg: byId.get(row.agentId)?.ratingAvg ?? null,
        sales: row._count._all,
        revenuePaisa: revenueById.get(row.agentId) ?? 0,
      })),
    };
  }

  /**
   * Every state change an admin makes is logged with before/after.
   *
   * This panel can suspend an account and approve money. "Who did this and
   * when" has to be answerable months later, including when the answer is
   * inconvenient.
   */
  private async audit(
    adminId: string,
    action: string,
    entity: string,
    entityId: string,
    before: unknown,
    after: unknown,
  ): Promise<void> {
    await this.prisma.adminAuditLog.create({
      data: {
        adminId,
        action,
        entity,
        entityId,
        before: before as never,
        after: after as never,
      },
    });
  }
}
