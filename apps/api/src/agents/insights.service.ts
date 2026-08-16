import { Injectable } from '@nestjs/common';

import { LeadChannel, PlanCode, PropertyStatus } from '@ghar/shared';

import { PrismaService } from '../common/prisma.service';

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

@Injectable()
export class InsightsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Premium buyer-demand insights.
   *
   * ⚠️ AGGREGATE ONLY — read README §9 before adding a field here.
   *
   * The premium pitch is "early info about buyers looking near you". The
   * version of that which sells best is also the one that gets the product
   * banned: handing an agent a list of who is browsing his area. Everything
   * below is a COUNT over a locality. No buyer identity, no phone number, no
   * precise location, and nothing that becomes identifying at low N — counts
   * under the threshold are suppressed rather than rounded, because "1 buyer
   * searched your street" is a person, not a statistic.
   *
   * A buyer's name and number reach the agent exactly one way: the buyer
   * contacts him, which creates a Lead.
   */
  private static readonly MIN_COHORT = 5;

  async forAgent(agentId: string) {
    const [since30, since60, since7] = [daysAgo(30), daysAgo(60), daysAgo(7)];

    const areas = await this.prisma.property.findMany({
      where: { agentId, status: PropertyStatus.ACTIVE },
      select: { city: true, locality: true },
      distinct: ['city', 'locality'],
      take: 20,
    });

    const [views30, views60, leads30, watch, leadsByChannel] = await Promise.all([
      this.prisma.propertyView.count({
        where: { property: { agentId }, createdAt: { gte: since30 } },
      }),
      this.prisma.propertyView.count({
        where: { property: { agentId }, createdAt: { gte: since60, lt: since30 } },
      }),
      this.prisma.lead.count({ where: { agentId, createdAt: { gte: since30 } } }),
      this.prisma.propertyView.aggregate({
        _avg: { watchRatio: true },
        where: { property: { agentId }, createdAt: { gte: since30 }, watchRatio: { not: null } },
      }),
      this.prisma.lead.groupBy({
        by: ['channel'],
        where: { agentId, createdAt: { gte: since30 } },
        _count: { _all: true },
      }),
    ]);

    // Demand per locality the agent actually works in. Counted across ALL
    // agents' listings there, which is what makes it a market signal rather
    // than a restatement of his own traffic.
    const demand = await Promise.all(
      areas
        .filter((area): area is { city: string; locality: string } => area.locality !== null)
        .slice(0, 5)
        .map(async (area) => {
          const [current, previous] = await Promise.all([
            this.prisma.propertyView.count({
              where: {
                viewerCity: area.city,
                viewerLocality: area.locality,
                createdAt: { gte: since7 },
              },
            }),
            this.prisma.propertyView.count({
              where: {
                viewerCity: area.city,
                viewerLocality: area.locality,
                createdAt: { gte: daysAgo(14), lt: since7 },
              },
            }),
          ]);

          return {
            city: area.city,
            locality: area.locality,
            searchesThisWeek: current,
            changePercent: previous === 0 ? null : Math.round(((current - previous) / previous) * 100),
            // Suppressed, not rounded: a cohort of one is a person.
            suppressed: current < InsightsService.MIN_COHORT,
          };
        }),
    );

    const savedSimilar = await this.prisma.favorite.count({
      where: { property: { agentId }, createdAt: { gte: since30 } },
    });

    return {
      views30,
      viewsChangePercent: views60 === 0 ? null : Math.round(((views30 - views60) / views60) * 100),
      leads30,
      savedSimilar: savedSimilar < InsightsService.MIN_COHORT ? null : savedSimilar,
      watchThrough: watch._avg.watchRatio,
      demand: demand.filter((area) => !area.suppressed),
      leadsByChannel: Object.fromEntries(
        Object.values(LeadChannel).map((channel) => [
          channel,
          leadsByChannel.find((row) => row.channel === channel)?._count._all ?? 0,
        ]),
      ) as Record<LeadChannel, number>,
    };
  }

  /**
   * Agent-facing performance report.
   *
   * Distinct from the admin platform report: this one is scoped to the agent's
   * own listings and never shows him another agent's numbers.
   */
  async reportForAgent(agentId: string, days: number) {
    const since = daysAgo(days);

    const [viewsByDay, topListings, leads, plan] = await Promise.all([
      this.prisma.$queryRaw<Array<{ day: Date; count: bigint }>>`
        SELECT date_trunc('day', v."createdAt") AS day, COUNT(*)::bigint AS count
        FROM property_views v
        JOIN properties p ON p.id = v."propertyId"
        WHERE p."agentId" = ${agentId}::uuid AND v."createdAt" >= ${since}
        GROUP BY 1
        ORDER BY 1 ASC
      `,
      this.prisma.property.findMany({
        where: { agentId },
        orderBy: { viewCount: 'desc' },
        take: 5,
        select: { id: true, titleUr: true, viewCount: true, city: true, locality: true },
      }),
      this.prisma.lead.groupBy({
        by: ['channel'],
        where: { agentId, createdAt: { gte: since } },
        _count: { _all: true },
      }),
      this.prisma.subscription.findUnique({
        where: { agentId },
        select: { planCode: true },
      }),
    ]);

    const totalViews = viewsByDay.reduce((sum, row) => sum + Number(row.count), 0);
    const totalLeads = leads.reduce((sum, row) => sum + row._count._all, 0);

    return {
      plan: plan?.planCode ?? PlanCode.BASIC,
      days,
      viewsByDay: viewsByDay.map((row) => ({
        day: row.day.toISOString().slice(0, 10),
        count: Number(row.count),
      })),
      leadsByChannel: leads.map((row) => ({ channel: row.channel, count: row._count._all })),
      topListings,
      totalViews,
      totalLeads,
      // The number an agent actually cares about: of everyone who looked, how
      // many picked up the phone.
      conversionPercent: totalViews === 0 ? null : Math.round((totalLeads / totalViews) * 1000) / 10,
    };
  }
}
