import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { z } from 'zod';

import {
  PropertyVisibility,
  createPropertySchema,
  markSoldSchema,
  publishPropertySchema,
  updatePropertySchema,
  type CreateProperty,
  type MarkSold,
  type Viewer,
} from '@ghar/shared';

import { BillingService } from '../billing/billing.service';
import { AgentId, CurrentViewer, Public } from '../common/auth.guard';
import { zodBody } from '../common/zod.pipe';
import { ListingsService } from './listings.service';

const visibilitySchema = z.object({
  visibility: z.enum(['public', 'hidden_from_agents', 'private']),
});

@Controller('listings')
export class ListingsController {
  constructor(
    private readonly listings: ListingsService,
    private readonly billing: BillingService,
  ) {}

  /**
   * Anonymous browsing is deliberate — a customer should be able to look at
   * properties before being asked for a phone number. The guard still parses a
   * token when present, because `hidden_from_agents` has to 404 for a rival
   * agent even though the route is public.
   */
  @Public()
  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentViewer() viewer: Viewer) {
    return this.listings.findForViewer(id, viewer);
  }

  @Post()
  async create(@AgentId() agentId: string, @Body(zodBody(createPropertySchema)) input: CreateProperty) {
    return this.listings.create(agentId, input);
  }

  @Patch(':id')
  async update(
    @AgentId() agentId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(zodBody(updatePropertySchema)) input: Partial<CreateProperty>,
  ) {
    return this.listings.update(agentId, id, input);
  }

  /**
   * What will publishing cost? Called live by the create wizard so the agent
   * sees "این اشتہار مفت ہے" or "Rs 50 لگیں گے" BEFORE tapping publish. Nobody
   * should discover a charge after the fact.
   */
  @Get(':id/publish-quote')
  async publishQuote(@AgentId() agentId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.billing.getQuota(agentId, id);
  }

  @Post(':id/publish')
  async publish(
    @AgentId() agentId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(zodBody(publishPropertySchema)) input: { payListingFeeNow: boolean },
  ) {
    return this.listings.publish(agentId, id, input.payListingFeeNow);
  }

  @Post(':id/outcome')
  async markOutcome(
    @AgentId() agentId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(zodBody(markSoldSchema)) input: MarkSold,
  ) {
    return this.listings.markOutcome(agentId, id, input);
  }

  @Patch(':id/visibility')
  async setVisibility(
    @AgentId() agentId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(zodBody(visibilitySchema)) input: { visibility: PropertyVisibility },
  ) {
    await this.listings.setVisibility(agentId, id, input.visibility);
    return { ok: true };
  }

  /** The agent's own listings, including drafts and hidden ones. */
  @Get()
  async mine(
    @AgentId() agentId: string,
    @Query('status') status?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.listings.listForAgent(agentId, status ?? null, cursor ?? null);
  }
}
