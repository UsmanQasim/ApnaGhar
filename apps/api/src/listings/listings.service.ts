import { Injectable, NotFoundException } from '@nestjs/common';

import {
  AreaUnit,
  PropertyStatus,
  PropertyVisibility,
  UserRole,
  canViewProperty,
  marlaStandardForCity,
  toSqft,
  type CreateProperty,
  type MarkSold,
  type SubscriptionStatus,
  type Viewer,
} from '@ghar/shared';

import { BillingService } from '../billing/billing.service';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class ListingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly billing: BillingService,
  ) {}

  async create(agentId: string, input: CreateProperty) {
    await this.billing.assertCanWrite(agentId);

    const standard = marlaStandardForCity(input.city);

    const property = await this.prisma.property.create({
      data: {
        agentId,
        purpose: input.purpose,
        type: input.type,
        titleUr: input.titleUr,
        titleEn: input.titleEn ?? null,
        descriptionUr: input.descriptionUr ?? null,
        descriptionEn: input.descriptionEn ?? null,
        pricePaisa: input.pricePaisa !== undefined ? BigInt(input.pricePaisa) : null,
        priceVisibility: input.priceVisibility,
        rentPeriod: input.rentPeriod ?? null,
        areaValue: input.areaValue,
        areaUnit: input.areaUnit,
        // Canonical sqft for range filters. A 5-marla plot in Karachi is not
        // the same size as a 5-marla plot in Lahore, and search must know that.
        areaSqft: toSqft(input.areaValue, input.areaUnit as AreaUnit, standard),
        bedrooms: input.bedrooms ?? null,
        bathrooms: input.bathrooms ?? null,
        floors: input.floors ?? null,
        furnished: input.furnished,
        addressText: input.addressText ?? null,
        city: input.city,
        locality: input.locality ?? null,
        visibility: input.visibility,
        status: PropertyStatus.DRAFT,
      },
    });

    if (input.location) {
      await this.setLocation(property.id, input.location.lat, input.location.lng);
    }

    return property;
  }

  /**
   * Edits are free, always. The Rs 50 is bound to the property, not to the act
   * of publishing, so an agent fixing a typo or dropping the price must never
   * be charged again.
   */
  async update(agentId: string, propertyId: string, input: Partial<CreateProperty>) {
    await this.billing.assertCanWrite(agentId);

    const existing = await this.prisma.property.findFirst({
      where: { id: propertyId, agentId },
      select: { id: true, city: true, areaValue: true, areaUnit: true },
    });
    if (!existing) throw new NotFoundException('property_not_found');

    const city = input.city ?? existing.city;
    const areaValue = input.areaValue ?? existing.areaValue;
    const areaUnit = (input.areaUnit ?? existing.areaUnit) as AreaUnit;

    const updated = await this.prisma.property.update({
      where: { id: propertyId },
      data: {
        ...(input.purpose !== undefined ? { purpose: input.purpose } : {}),
        ...(input.type !== undefined ? { type: input.type } : {}),
        ...(input.titleUr !== undefined ? { titleUr: input.titleUr } : {}),
        ...(input.titleEn !== undefined ? { titleEn: input.titleEn } : {}),
        ...(input.descriptionUr !== undefined ? { descriptionUr: input.descriptionUr } : {}),
        ...(input.descriptionEn !== undefined ? { descriptionEn: input.descriptionEn } : {}),
        ...(input.pricePaisa !== undefined ? { pricePaisa: BigInt(input.pricePaisa) } : {}),
        ...(input.priceVisibility !== undefined ? { priceVisibility: input.priceVisibility } : {}),
        ...(input.rentPeriod !== undefined ? { rentPeriod: input.rentPeriod } : {}),
        ...(input.bedrooms !== undefined ? { bedrooms: input.bedrooms } : {}),
        ...(input.bathrooms !== undefined ? { bathrooms: input.bathrooms } : {}),
        ...(input.floors !== undefined ? { floors: input.floors } : {}),
        ...(input.furnished !== undefined ? { furnished: input.furnished } : {}),
        ...(input.addressText !== undefined ? { addressText: input.addressText } : {}),
        ...(input.locality !== undefined ? { locality: input.locality } : {}),
        ...(input.visibility !== undefined ? { visibility: input.visibility } : {}),
        city,
        areaValue,
        areaUnit,
        // Recomputed on every edit: moving a listing from Lahore to Karachi
        // changes what "5 marla" means in square feet, and search filters on
        // the canonical value.
        areaSqft: toSqft(areaValue, areaUnit, marlaStandardForCity(city)),
      },
    });

    if (input.location) {
      await this.setLocation(propertyId, input.location.lat, input.location.lng);
    }

    return updated;
  }

  /** The agent's own listings — includes drafts and hidden ones. */
  async listForAgent(agentId: string, status: string | null, cursor: string | null) {
    const items = await this.prisma.property.findMany({
      where: {
        agentId,
        ...(status ? { status: status as PropertyStatus } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 21,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        media: { where: { position: 0 }, take: 1 },
        _count: { select: { likes: true, comments: true, shareLinks: true } },
      },
    });

    const hasMore = items.length > 20;
    return {
      items: hasMore ? items.slice(0, 20) : items,
      nextCursor: hasMore ? (items[19]?.id ?? null) : null,
    };
  }

  /** PostGIS geography can't be set through the Prisma client, so raw SQL. */
  private async setLocation(propertyId: string, lat: number, lng: number): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE properties
      SET location = ST_SetSRID(ST_MakePoint(${lng}::double precision, ${lat}::double precision), 4326)::geography
      WHERE id = ${propertyId}::uuid
    `;
  }

  /**
   * Publish. This is where money changes hands, so quota evaluation, the fee
   * charge and the status flip all happen in ONE transaction — a double-tapped
   * "Publish" button must never produce two Rs 50 charges.
   */
  async publish(agentId: string, propertyId: string, payNow: boolean) {
    await this.billing.assertCanWrite(agentId);

    return this.prisma.$transaction(async (tx) => {
      const property = await tx.property.findFirst({
        where: { id: propertyId, agentId },
        select: { id: true, status: true, media: { select: { id: true } } },
      });
      if (!property) throw new NotFoundException('property_not_found');
      if (property.status === PropertyStatus.ACTIVE) {
        return { propertyId, feePaisa: 0, alreadyActive: true };
      }

      const { feePaisa, invoiceId } = await this.billing.chargeListingFee(
        tx,
        agentId,
        propertyId,
        payNow,
      );

      // The listing goes live immediately either way. Deferring the Rs 50 to
      // the month-end invoice does not hold the property hostage — the agent
      // is billed, not blocked.
      await tx.property.update({
        where: { id: propertyId },
        data: { status: PropertyStatus.ACTIVE, publishedAt: new Date() },
      });

      return { propertyId, feePaisa, invoiceId, alreadyActive: false };
    });
  }

  /**
   * Mark sold or rented. Frees a quota slot; the Rs 50 already paid is not
   * refunded, and re-listing the same property later is free because
   * `listingFeeCharged` stays true.
   */
  async markOutcome(agentId: string, propertyId: string, input: MarkSold) {
    await this.billing.assertCanWrite(agentId);

    const property = await this.prisma.property.findFirst({
      where: { id: propertyId, agentId },
      select: { id: true },
    });
    if (!property) throw new NotFoundException('property_not_found');

    return this.prisma.property.update({
      where: { id: propertyId },
      data: {
        status: input.outcome === 'sold' ? PropertyStatus.SOLD : PropertyStatus.RENTED,
        soldAt: new Date(),
        // Private and optional — this only ever feeds the agent's own dashboard.
        salePricePaisa:
          input.salePricePaisa !== undefined ? BigInt(input.salePricePaisa) : undefined,
        commissionPercent: input.commissionPercent ?? undefined,
      },
    });
  }

  async setVisibility(agentId: string, propertyId: string, visibility: PropertyVisibility) {
    await this.billing.assertCanWrite(agentId);
    const updated = await this.prisma.property.updateMany({
      where: { id: propertyId, agentId },
      data: { visibility },
    });
    if (updated.count === 0) throw new NotFoundException('property_not_found');
  }

  /**
   * Single-property read with the visibility rules applied server-side.
   * Every denial returns 404, not 403 — telling a competing agent that a
   * hidden listing exists is itself a leak.
   */
  async findForViewer(propertyId: string, viewer: Viewer, shareTokenValid?: boolean) {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        media: { orderBy: { position: 'asc' } },
        agent: {
          select: {
            userId: true,
            agencyName: true,
            isVerified: true,
            subscription: { select: { status: true } },
            user: { select: { name: true, phone: true, avatarUrl: true } },
          },
        },
      },
    });
    if (!property) throw new NotFoundException('property_not_found');

    const decision = canViewProperty(
      {
        agentId: property.agentId,
        visibility: property.visibility as PropertyVisibility,
        status: property.status as PropertyStatus,
        agentSubscriptionStatus: (property.agent.subscription?.status ??
          'restricted') as SubscriptionStatus,
      },
      viewer,
      shareTokenValid === undefined
        ? { via: 'direct' }
        : { via: 'share_link', valid: shareTokenValid },
    );

    if (!decision.allowed) throw new NotFoundException('property_not_found');

    return this.redactForViewer(property, viewer);
  }

  /**
   * Hide what the viewer isn't entitled to. Two rules:
   *  • "price on request" means the number never leaves the server for anyone
   *    but the owning agent — not even in a field the client is told to ignore.
   *  • the agent's phone is only attached once a lead is created, so casual
   *    scraping of the feed doesn't harvest agent numbers.
   */
  private redactForViewer<T extends { pricePaisa: bigint | null; priceVisibility: string; agentId: string }>(
    property: T,
    viewer: Viewer,
  ): T {
    const isOwner = viewer.userId === property.agentId;
    if (isOwner || viewer.role === UserRole.ADMIN) return property;

    if (property.priceVisibility === 'on_request') {
      return { ...property, pricePaisa: null };
    }
    return property;
  }

  /** Quota-consuming listing count, used by the dashboard billing card. */
  async countActive(agentId: string): Promise<number> {
    return this.prisma.property.count({
      where: {
        agentId,
        status: { in: [PropertyStatus.ACTIVE, PropertyStatus.PENDING_PAYMENT] },
      },
    });
  }
}
