import { Injectable, NotFoundException } from '@nestjs/common';

import { PropertyStatus, PropertyVisibility, QUOTA_CONSUMING_STATUSES } from '@ghar/shared';

import { PrismaService } from '../common/prisma.service';

/** Start of the current calendar month, in the server's timezone. */
function startOfMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

@Injectable()
export class AgentsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * The four tiles at the top of the agent dashboard.
   *
   * Counted over the calendar month rather than the billing cycle: the agent
   * thinks in months, and a "this month" number that resets on the 14th
   * because that is when he subscribed reads as a bug.
   */
  async statsForAgent(agentId: string) {
    const since = startOfMonth();

    const [viewsThisMonth, leadsThisMonth, listedThisMonth, soldThisMonth] = await Promise.all([
      this.prisma.propertyView.count({
        where: { property: { agentId }, createdAt: { gte: since } },
      }),
      this.prisma.lead.count({ where: { agentId, createdAt: { gte: since } } }),
      this.prisma.property.count({
        where: { agentId, publishedAt: { gte: since } },
      }),
      this.prisma.property.count({
        where: {
          agentId,
          status: { in: [PropertyStatus.SOLD, PropertyStatus.RENTED] },
          soldAt: { gte: since },
        },
      }),
    ]);

    return { viewsThisMonth, leadsThisMonth, listedThisMonth, soldThisMonth };
  }

  /** The signed-in agent's own record, including fields no one else may see. */
  async me(agentId: string) {
    const agent = await this.prisma.agent.findUnique({
      where: { userId: agentId },
      include: {
        user: { select: { name: true, phone: true, avatarUrl: true, createdAt: true } },
        subscription: { select: { planCode: true, status: true, currentPeriodEnd: true } },
      },
    });
    if (!agent) throw new NotFoundException('agent_not_found');

    const activeListings = await this.prisma.property.count({
      where: { agentId, status: { in: [...QUOTA_CONSUMING_STATUSES] } },
    });

    return { ...agent, activeListings };
  }

  async updateMe(
    agentId: string,
    input: { agencyName?: string; city?: string; bioUr?: string; whatsappPhone?: string },
  ) {
    return this.prisma.agent.update({
      where: { userId: agentId },
      data: {
        ...(input.agencyName !== undefined ? { agencyName: input.agencyName } : {}),
        ...(input.city !== undefined ? { city: input.city } : {}),
        ...(input.bioUr !== undefined ? { bioUr: input.bioUr } : {}),
        ...(input.whatsappPhone !== undefined ? { whatsappPhone: input.whatsappPhone } : {}),
      },
    });
  }

  /**
   * Public agent profile.
   *
   * The phone number is NOT included. A profile page is exactly the surface a
   * scraper would walk to harvest every agent's number in a city; the number is
   * released one at a time by POST /leads, which records who asked.
   */
  async publicProfile(agentId: string) {
    const agent = await this.prisma.agent.findUnique({
      where: { userId: agentId },
      select: {
        userId: true,
        agencyName: true,
        isVerified: true,
        city: true,
        bioUr: true,
        bioEn: true,
        ratingAvg: true,
        ratingCount: true,
        createdAt: true,
        user: { select: { name: true, avatarUrl: true } },
      },
    });
    if (!agent) throw new NotFoundException('agent_not_found');

    const [activeCount, closedCount] = await Promise.all([
      this.prisma.property.count({
        where: { agentId, status: PropertyStatus.ACTIVE, visibility: PropertyVisibility.PUBLIC },
      }),
      this.prisma.property.count({
        where: { agentId, status: { in: [PropertyStatus.SOLD, PropertyStatus.RENTED] } },
      }),
    ]);

    return {
      ...agent,
      activeCount,
      closedCount,
      memberSince: agent.createdAt,
    };
  }

  /**
   * An agent's listings as the PUBLIC sees them.
   *
   * Only `public` visibility: a `hidden_from_agents` listing must not surface
   * here either, or the profile page becomes the hole in the visibility model.
   */
  async publicListings(agentId: string, closed: boolean, cursor: string | null) {
    const take = 20;
    const items = await this.prisma.property.findMany({
      where: {
        agentId,
        visibility: PropertyVisibility.PUBLIC,
        status: closed
          ? { in: [PropertyStatus.SOLD, PropertyStatus.RENTED] }
          : PropertyStatus.ACTIVE,
      },
      orderBy: { publishedAt: 'desc' },
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: { media: { where: { position: 0 }, take: 1 } },
    });

    const hasMore = items.length > take;
    const page = hasMore ? items.slice(0, take) : items;

    return { items: page, nextCursor: hasMore ? (page[page.length - 1]?.id ?? null) : null };
  }
}
