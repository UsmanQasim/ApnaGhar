import { Injectable, NotFoundException } from '@nestjs/common';

import {
  SubscriptionStatus,
  canViewProperty,
  type LeadChannel,
  type ViewSource,
  type Viewer,
} from '@ghar/shared';

import { PrismaService } from '../common/prisma.service';

@Injectable()
export class EngagementService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Record a view.
   *
   * Fire-and-forget from the client's point of view: it must never block the
   * property from rendering, and a failure here is not worth an error message.
   * Location is coarse (city/locality) by schema design — never a pin, never an
   * IP. That constraint is what makes the premium demand insights defensible.
   */
  async recordView(
    input: { propertyId: string; source: ViewSource; watchRatio?: number },
    viewer: Viewer,
  ) {
    const property = await this.prisma.property.findUnique({
      where: { id: input.propertyId },
      select: { id: true, city: true, locality: true },
    });
    if (!property) throw new NotFoundException('property_not_found');

    await this.prisma.$transaction([
      this.prisma.propertyView.create({
        data: {
          propertyId: property.id,
          viewerId: viewer.userId,
          source: input.source,
          viewerCity: property.city,
          viewerLocality: property.locality,
          ...(input.watchRatio !== undefined ? { watchRatio: input.watchRatio } : {}),
        },
      }),
      this.prisma.property.update({
        where: { id: property.id },
        data: { viewCount: { increment: 1 } },
      }),
    ]);

    return { ok: true };
  }

  /**
   * Create a lead AND hand back the agent's number.
   *
   * This is the only route that releases an agent's phone number. The number is
   * deliberately absent from the feed, from search results and from the public
   * profile, so harvesting every agent in a city means creating a lead per
   * agent — which is rate-limited, attributed, and visible on the agent's own
   * dashboard as an enquiry.
   *
   * Handing back the number and recording the lead in one call also means the
   * two can never disagree: there is no path where a customer gets a number
   * without the agent being told someone asked for it.
   */
  async createLead(input: { propertyId: string; channel: LeadChannel }, viewer: Viewer) {
    const property = await this.prisma.property.findUnique({
      where: { id: input.propertyId },
      select: {
        id: true,
        agentId: true,
        visibility: true,
        status: true,
        agent: {
          select: {
            whatsappPhone: true,
            subscription: { select: { status: true } },
            user: { select: { name: true, phone: true } },
          },
        },
      },
    });

    // 404 rather than 403 on a hidden listing — see ListingsService. A rival
    // agent must not be able to distinguish "hidden from you" from "does not
    // exist", or the 403 itself becomes the leak.
    if (!property) throw new NotFoundException('property_not_found');

    const decision = canViewProperty(
      {
        agentId: property.agentId,
        visibility: property.visibility,
        status: property.status,
        agentSubscriptionStatus: (property.agent.subscription?.status ??
          SubscriptionStatus.RESTRICTED) as SubscriptionStatus,
      },
      viewer,
    );
    if (!decision.allowed) throw new NotFoundException('property_not_found');

    await this.prisma.lead.create({
      data: {
        propertyId: property.id,
        agentId: property.agentId,
        customerId: viewer.userId,
        channel: input.channel,
      },
    });

    return {
      agentName: property.agent.user.name,
      phone: property.agent.user.phone,
      whatsappPhone: property.agent.whatsappPhone ?? property.agent.user.phone,
    };
  }

  /** Toggle. Returns the resulting state so the heart can't desync from the row. */
  async toggleFavorite(userId: string, propertyId: string) {
    const existing = await this.prisma.favorite.findUnique({
      where: { userId_propertyId: { userId, propertyId } },
    });

    if (existing) {
      await this.prisma.favorite.delete({
        where: { userId_propertyId: { userId, propertyId } },
      });
      return { saved: false };
    }

    await this.prisma.favorite.create({ data: { userId, propertyId } });
    return { saved: true };
  }

  async listFavorites(userId: string) {
    const rows = await this.prisma.favorite.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        property: { include: { media: { where: { position: 0 }, take: 1 } } },
      },
    });
    return { items: rows.map((row) => row.property) };
  }
}
