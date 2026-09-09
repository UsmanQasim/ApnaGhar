import { createHash, randomBytes } from 'node:crypto';

import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  PropertyStatus,
  evaluateShareLink,
  type CreateShareLink,
  type ShareLinkInvalidReason,
} from '@ghar/shared';

import { BillingService } from '../billing/billing.service';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class ShareService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly billing: BillingService,
  ) {}

  /**
   * Mint a share link. The token is 32 random bytes — it IS the credential for
   * a private listing, so it must be unguessable, and it is never derived from
   * the property id.
   */
  async create(agentId: string, input: CreateShareLink) {
    await this.billing.assertCanWrite(agentId);

    const property = await this.prisma.property.findFirst({
      where: { id: input.propertyId, agentId },
      select: { id: true, status: true },
    });
    if (!property) throw new NotFoundException('property_not_found');
    if (property.status === PropertyStatus.DRAFT) {
      throw new ForbiddenException('cannot_share_a_draft');
    }

    const token = randomBytes(32).toString('base64url');
    const expiresAt =
      input.expiresInMinutes === null
        ? null
        : new Date(Date.now() + input.expiresInMinutes * 60_000);

    const link = await this.prisma.shareLink.create({
      data: {
        propertyId: input.propertyId,
        createdById: agentId,
        token,
        recipientName: input.recipientName ?? null,
        recipientPhone: input.recipientPhone ?? null,
        requireOtp: input.requireOtp,
        expiresAt,
        maxViews: input.maxViews,
      },
    });

    await this.prisma.property.update({
      where: { id: input.propertyId },
      data: { shareCount: { increment: 1 } },
    });

    return {
      id: link.id,
      url: `${this.config.getOrThrow<string>('SHARE_BASE_URL')}/s/${token}`,
      expiresAt,
      maxViews: link.maxViews,
    };
  }

  /**
   * Resolve a token. Returns the reason on failure so the share page can show a
   * polite Urdu message with a "contact agent" button — never a raw 404, which
   * reads to a customer as "the agent lied to me".
   */
  async resolve(
    token: string,
    ip: string,
    userAgent: string | null,
  ): Promise<
    | { ok: true; propertyId: string; linkId: string; expiresAt: Date | null }
    | { ok: false; reason: ShareLinkInvalidReason | 'not_found' }
  > {
    const link = await this.prisma.shareLink.findUnique({ where: { token } });
    if (!link) return { ok: false, reason: 'not_found' };

    const verdict = evaluateShareLink(
      {
        expiresAt: link.expiresAt,
        maxViews: link.maxViews,
        viewCount: link.viewCount,
        revokedAt: link.revokedAt,
      },
      new Date(),
    );

    if (!verdict.valid) return { ok: false, reason: verdict.reason };

    // Count the view and record it so the agent sees "viewed 3 times".
    // The IP is hashed with a daily salt: enough to distinguish viewers, not
    // enough to be a stored IP log.
    await this.prisma.$transaction([
      this.prisma.shareLink.update({
        where: { id: link.id },
        data: { viewCount: { increment: 1 } },
      }),
      this.prisma.shareLinkView.create({
        data: {
          shareLinkId: link.id,
          ipHash: this.hashIp(ip),
          userAgent: userAgent?.slice(0, 300) ?? null,
        },
      }),
    ]);

    return {
      ok: true,
      propertyId: link.propertyId,
      linkId: link.id,
      expiresAt: link.expiresAt,
    };
  }

  private hashIp(ip: string): string {
    const dailySalt = new Date().toISOString().slice(0, 10);
    return createHash('sha256').update(`${ip}:${dailySalt}`).digest('hex');
  }

  async revoke(agentId: string, linkId: string): Promise<void> {
    const updated = await this.prisma.shareLink.updateMany({
      where: { id: linkId, createdById: agentId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (updated.count === 0) throw new NotFoundException('share_link_not_found');
  }

  /** Per-link analytics for the agent: who opened it, how often, when. */
  async listForProperty(agentId: string, propertyId: string) {
    const links = await this.prisma.shareLink.findMany({
      where: { propertyId, createdById: agentId },
      orderBy: { createdAt: 'desc' },
      include: {
        views: { orderBy: { viewedAt: 'desc' }, take: 20 },
        _count: { select: { views: true } },
      },
    });

    // `create` returns a ready-made `url`; this used to return only the raw
    // token, so any client listing existing links had to know SHARE_BASE_URL
    // itself. The mobile app has no reason to — build it in the one place that
    // already holds the value.
    const base = this.config.getOrThrow<string>('SHARE_BASE_URL');
    return links.map((link) => ({ ...link, url: `${base}/s/${link.token}` }));
  }
}
