import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { UserRole, type SearchProperties, type Viewer } from '@ghar/shared';

import { PrismaService } from '../common/prisma.service';

interface SearchRow {
  id: string;
  titleUr: string;
  titleEn: string | null;
  pricePaisa: bigint | null;
  priceVisibility: string;
  purpose: string;
  type: string;
  city: string;
  locality: string | null;
  areaValue: number;
  areaUnit: string;
  bedrooms: number | null;
  bathrooms: number | null;
  viewCount: number;
  likeCount: number;
  publishedAt: Date | null;
  thumbnailUrl: string | null;
  hasVideo: boolean;
  agentVerified: boolean;
  distanceMeters: number | null;
  promoted: boolean;
}

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Raw SQL rather than the Prisma query builder, because this needs three
   * things Prisma can't express: PostGIS `ST_DWithin`, `tsvector` ranking, and
   * trigram similarity for transliterated locality names ("johar town" must
   * match "Johar Town", and near-misses should still rank).
   *
   * Promoted slots are inserted at FIXED, LABELLED positions rather than being
   * blended into organic results. A buyer must be able to tell what he is
   * being sold.
   */
  async search(input: SearchProperties, viewer: Viewer) {
    const where: Prisma.Sql[] = [
      Prisma.sql`p.status = 'active'`,
      // Restricted agents' listings vanish from search entirely, without
      // anything being deleted.
      Prisma.sql`s.status IN ('trialing', 'active', 'past_due')`,
    ];

    // Visibility: a private listing is never searchable, and a
    // hidden_from_agents listing is invisible to OTHER agents specifically.
    if (viewer.role === UserRole.AGENT && viewer.userId) {
      where.push(
        Prisma.sql`(p.visibility = 'public' OR (p.visibility = 'hidden_from_agents' AND p."agentId" = ${viewer.userId}::uuid))`,
      );
    } else {
      where.push(Prisma.sql`p.visibility IN ('public', 'hidden_from_agents')`);
    }

    if (input.purpose) where.push(Prisma.sql`p.purpose = ${input.purpose}::"PropertyPurpose"`);
    if (input.city) where.push(Prisma.sql`p.city ILIKE ${input.city}`);
    if (input.locality) where.push(Prisma.sql`p.locality % ${input.locality}`);
    if (input.bedrooms !== undefined) where.push(Prisma.sql`p.bedrooms >= ${input.bedrooms}`);
    if (input.bathrooms !== undefined) where.push(Prisma.sql`p.bathrooms >= ${input.bathrooms}`);
    if (input.furnished !== undefined) where.push(Prisma.sql`p.furnished = ${input.furnished}`);
    if (input.minAreaSqft !== undefined) where.push(Prisma.sql`p."areaSqft" >= ${input.minAreaSqft}`);
    if (input.maxAreaSqft !== undefined) where.push(Prisma.sql`p."areaSqft" <= ${input.maxAreaSqft}`);

    // Price filters deliberately EXCLUDE "on request" listings rather than
    // treating a null price as 0 — otherwise every negotiable listing would
    // pollute the cheapest bucket.
    if (input.minPricePaisa !== undefined) {
      where.push(
        Prisma.sql`(p."priceVisibility" = 'public' AND p."pricePaisa" >= ${BigInt(input.minPricePaisa)})`,
      );
    }
    if (input.maxPricePaisa !== undefined) {
      where.push(
        Prisma.sql`(p."priceVisibility" = 'public' AND p."pricePaisa" <= ${BigInt(input.maxPricePaisa)})`,
      );
    }

    if (input.type?.length) {
      where.push(Prisma.sql`p.type = ANY(${input.type}::"PropertyType"[])`);
    }
    if (input.hasVideo) {
      where.push(
        Prisma.sql`EXISTS (SELECT 1 FROM property_media m WHERE m."propertyId" = p.id AND m.kind = 'video' AND m."processingStatus" = 'ready')`,
      );
    }
    if (input.verifiedAgentsOnly) where.push(Prisma.sql`a."isVerified" = true`);

    const point = input.near
      ? Prisma.sql`ST_SetSRID(ST_MakePoint(${input.near.lng}, ${input.near.lat}), 4326)::geography`
      : null;

    if (point) {
      where.push(Prisma.sql`ST_DWithin(p.location, ${point}, ${input.radiusKm * 1000})`);
    }

    const textQuery = input.q?.trim();
    if (textQuery) {
      where.push(
        Prisma.sql`(p.search_vector @@ plainto_tsquery('simple', ${textQuery})
          OR p.city % ${textQuery} OR p.locality % ${textQuery})`,
      );
    }

    const orderBy = this.buildOrder(input.sort, textQuery, point);

    const rows = await this.prisma.$queryRaw<SearchRow[]>`
      SELECT
        p.id, p."titleUr", p."titleEn", p."pricePaisa", p."priceVisibility"::text,
        p.purpose::text, p.type::text, p.city, p.locality,
        p."areaValue", p."areaUnit"::text, p.bedrooms, p.bathrooms,
        p."viewCount", p."likeCount", p."publishedAt",
        (SELECT m."thumbnailUrl" FROM property_media m
          WHERE m."propertyId" = p.id ORDER BY m.position LIMIT 1) AS "thumbnailUrl",
        EXISTS (SELECT 1 FROM property_media m
          WHERE m."propertyId" = p.id AND m.kind = 'video') AS "hasVideo",
        a."isVerified" AS "agentVerified",
        ${point ? Prisma.sql`ST_Distance(p.location, ${point})` : Prisma.sql`NULL::double precision`} AS "distanceMeters",
        EXISTS (SELECT 1 FROM boosts b
          WHERE b."propertyId" = p.id AND b.type = 'top_search'
            AND now() BETWEEN b."startsAt" AND b."endsAt") AS promoted
      FROM properties p
      JOIN agents a ON a."userId" = p."agentId"
      JOIN subscriptions s ON s."agentId" = p."agentId"
      WHERE ${Prisma.join(where, ' AND ')}
      ORDER BY ${orderBy}
      LIMIT ${input.limit + 1}
      OFFSET ${input.cursor ? Number(input.cursor) : 0}
    `;

    const hasMore = rows.length > input.limit;
    const items = hasMore ? rows.slice(0, input.limit) : rows;

    return {
      items: items.map((row) => ({
        ...row,
        // "Price on request" never leaves the server as a number, not even in
        // a field the client is told to ignore.
        pricePaisa: row.priceVisibility === 'on_request' ? null : row.pricePaisa,
      })),
      nextCursor: hasMore ? String((input.cursor ? Number(input.cursor) : 0) + input.limit) : null,
    };
  }

  private buildOrder(
    sort: SearchProperties['sort'],
    textQuery: string | undefined,
    point: Prisma.Sql | null,
  ): Prisma.Sql {
    // Promoted listings always float to the top, and the client labels them
    // "تجویز کردہ". They are never silently mixed into organic results.
    const promotedFirst = Prisma.sql`promoted DESC,`;

    switch (sort) {
      case 'newest':
        return Prisma.sql`${promotedFirst} p."publishedAt" DESC NULLS LAST`;
      case 'price_asc':
        return Prisma.sql`${promotedFirst} p."pricePaisa" ASC NULLS LAST`;
      case 'price_desc':
        return Prisma.sql`${promotedFirst} p."pricePaisa" DESC NULLS LAST`;
      case 'nearest':
        return point
          ? Prisma.sql`${promotedFirst} "distanceMeters" ASC NULLS LAST`
          : Prisma.sql`${promotedFirst} p."publishedAt" DESC NULLS LAST`;
      case 'relevance':
      default:
        if (textQuery) {
          return Prisma.sql`${promotedFirst}
            ts_rank(p.search_vector, plainto_tsquery('simple', ${textQuery})) DESC,
            p."publishedAt" DESC NULLS LAST`;
        }
        // No query: rank by engagement decayed over time, so a good listing
        // from last week can still outrank a dull one from this morning.
        return Prisma.sql`${promotedFirst}
          (p."likeCount" * 3 + p."viewCount")
            / POWER(EXTRACT(EPOCH FROM (now() - COALESCE(p."publishedAt", p."createdAt"))) / 3600 + 2, 1.5)
          DESC`;
    }
  }
}
