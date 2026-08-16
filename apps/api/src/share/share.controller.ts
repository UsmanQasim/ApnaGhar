import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Req } from '@nestjs/common';
import type { Request } from 'express';

import { createShareLinkSchema, type CreateShareLink } from '@ghar/shared';

import { AgentId, Public } from '../common/auth.guard';
import { zodBody } from '../common/zod.pipe';
import { ListingsService } from '../listings/listings.service';
import { ShareService } from './share.service';

@Controller()
export class ShareController {
  constructor(
    private readonly share: ShareService,
    private readonly listings: ListingsService,
  ) {}

  @Post('share')
  async create(
    @AgentId() agentId: string,
    @Body(zodBody(createShareLinkSchema)) input: CreateShareLink,
  ) {
    return this.share.create(agentId, input);
  }

  @Get('share/property/:id')
  async listForProperty(@AgentId() agentId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.share.listForProperty(agentId, id);
  }

  @Delete('share/:id')
  async revoke(@AgentId() agentId: string, @Param('id', ParseUUIDPipe) id: string) {
    await this.share.revoke(agentId, id);
    return { ok: true };
  }

  /**
   * Resolve a share token. Public and unauthenticated — the whole point is that
   * the agent's customer opens it from WhatsApp without installing anything.
   *
   * A dead link returns 200 with a reason, not 404. The share page renders a
   * polite Urdu message and a "contact agent" button; a raw error page reads to
   * the customer as though the agent misled them.
   */
  @Public()
  @Get('s/:token')
  async resolve(@Param('token') token: string, @Req() request: Request) {
    const ip =
      (request.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ??
      request.socket.remoteAddress ??
      'unknown';

    const result = await this.share.resolve(
      token,
      ip,
      (request.headers['user-agent'] as string | undefined) ?? null,
    );

    if (!result.ok) return { ok: false as const, reason: result.reason };

    const property = await this.listings.findForViewer(
      result.propertyId,
      { userId: null, role: null },
      true,
    );

    // The share page renders a countdown ("یہ لنک 27 منٹ باقی"), so it needs the
    // expiry. Returning it here rather than making the page fetch twice.
    return { ok: true as const, property, expiresAt: result.expiresAt };
  }
}
