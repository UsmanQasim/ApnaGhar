import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import type { z } from 'zod';

import { createLeadSchema, recordViewSchema, type Viewer } from '@ghar/shared';

import { CurrentViewer, Public } from '../common/auth.guard';
import { zodBody } from '../common/zod.pipe';
import { EngagementService } from './engagement.service';

@Controller()
export class EngagementController {
  constructor(private readonly engagement: EngagementService) {}

  /** Anonymous browsing is the default, so views are counted anonymously too. */
  @Public()
  @Post('views')
  async recordView(
    @Body(zodBody(recordViewSchema)) input: z.infer<typeof recordViewSchema>,
    @CurrentViewer() viewer: Viewer,
  ) {
    return this.engagement.recordView(input, viewer);
  }

  /**
   * Releases the agent's phone number. Rate-limited hard: this is the endpoint
   * a scraper would walk to build a list of every agent in Lahore, and 10/min
   * is far above what a real buyer does and far below what harvesting needs.
   */
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('leads')
  async createLead(
    @Body(zodBody(createLeadSchema)) input: z.infer<typeof createLeadSchema>,
    @CurrentViewer() viewer: Viewer,
  ) {
    return this.engagement.createLead(input, viewer);
  }

  @Post('favorites/:propertyId')
  async toggleFavorite(
    @CurrentViewer() viewer: Viewer,
    @Param('propertyId', ParseUUIDPipe) propertyId: string,
  ) {
    return this.engagement.toggleFavorite(viewer.userId as string, propertyId);
  }

  @Get('favorites')
  async favorites(@CurrentViewer() viewer: Viewer) {
    return this.engagement.listFavorites(viewer.userId as string);
  }
}
