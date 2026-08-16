import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query } from '@nestjs/common';
import { z } from 'zod';

import { phoneSchema } from '@ghar/shared';

import { AgentId, Public } from '../common/auth.guard';
import { zodBody } from '../common/zod.pipe';
import { AgentsService } from './agents.service';

const updateAgentSchema = z.object({
  agencyName: z.string().trim().max(160).optional(),
  city: z.string().trim().max(80).optional(),
  bioUr: z.string().trim().max(1000).optional(),
  whatsappPhone: phoneSchema.optional(),
});

@Controller('agents')
export class AgentsController {
  constructor(private readonly agents: AgentsService) {}

  /** Dashboard tiles. Must stay cheap — it runs on every cold start. */
  @Get('me/stats')
  async stats(@AgentId() agentId: string) {
    return this.agents.statsForAgent(agentId);
  }

  @Get('me')
  async me(@AgentId() agentId: string) {
    return this.agents.me(agentId);
  }

  @Patch('me')
  async updateMe(
    @AgentId() agentId: string,
    @Body(zodBody(updateAgentSchema)) input: z.infer<typeof updateAgentSchema>,
  ) {
    return this.agents.updateMe(agentId, input);
  }

  /**
   * Public profile. Anonymous by design — a customer following a WhatsApp link
   * to "علی خان" should not be asked to sign in before seeing who he is.
   */
  @Public()
  @Get(':id')
  async profile(@Param('id', ParseUUIDPipe) id: string) {
    return this.agents.publicProfile(id);
  }

  @Public()
  @Get(':id/listings')
  async listings(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('closed') closed?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.agents.publicListings(id, closed === 'true', cursor ?? null);
  }
}
