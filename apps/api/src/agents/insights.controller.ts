import { Controller, ForbiddenException, Get, Query } from '@nestjs/common';

import { PlanCode } from '@ghar/shared';

import { AgentId } from '../common/auth.guard';
import { PrismaService } from '../common/prisma.service';
import { InsightsService } from './insights.service';

@Controller('insights')
export class InsightsController {
  constructor(
    private readonly insights: InsightsService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Premium-only. Gated on the SERVER, not by hiding the menu item: the app is
   * a public API client, and "premium features" that are only hidden in the UI
   * are not gated at all.
   */
  @Get()
  async forAgent(@AgentId() agentId: string) {
    await this.assertPremium(agentId);
    return this.insights.forAgent(agentId);
  }

  /** Available on every plan — an agent's own performance is not a paid feature. */
  @Get('report')
  async report(@AgentId() agentId: string, @Query('days') days?: string) {
    const window = Number(days ?? 30);
    return this.insights.reportForAgent(agentId, [7, 30, 90, 365].includes(window) ? window : 30);
  }

  private async assertPremium(agentId: string): Promise<void> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { agentId },
      select: { planCode: true },
    });
    if (subscription?.planCode !== PlanCode.PREMIUM) {
      throw new ForbiddenException('premium_required');
    }
  }
}
