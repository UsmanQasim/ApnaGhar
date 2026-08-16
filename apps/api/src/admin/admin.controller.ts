import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { z } from 'zod';

import {
  PropertyPurpose,
  PropertyStatus,
  PropertyType,
  UserRole,
  UserStatus,
  type Viewer,
} from '@ghar/shared';

import { CurrentViewer, Roles } from '../common/auth.guard';
import { zodBody } from '../common/zod.pipe';
import { AdminService } from './admin.service';

const enumValues = <T extends Record<string, string>>(e: T) =>
  Object.values(e) as [T[keyof T], ...T[keyof T][]];

const setVerifiedSchema = z.object({ verified: z.boolean() });
const setStatusSchema = z.object({ status: z.enum(enumValues(UserStatus)) });
const setListingStatusSchema = z.object({ status: z.enum(enumValues(PropertyStatus)) });

/**
 * Admin panel API.
 *
 * `@Roles(ADMIN)` is applied at the CLASS level rather than per method, so a
 * route added later is protected by default. Getting that wrong on one handler
 * in this controller means exposing every agent's revenue.
 */
@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('overview')
  async overview() {
    return this.admin.overview();
  }

  @Get('agents')
  async agents(
    @Query('q') q?: string,
    @Query('verified') verified?: string,
    @Query('suspended') suspended?: string,
  ) {
    return this.admin.agents({
      ...(q ? { q } : {}),
      ...(verified !== undefined ? { verified: verified === 'true' } : {}),
      ...(suspended !== undefined ? { suspended: suspended === 'true' } : {}),
    });
  }

  @Post('agents/:id/verified')
  async setVerified(
    @CurrentViewer() viewer: Viewer,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(zodBody(setVerifiedSchema)) input: z.infer<typeof setVerifiedSchema>,
  ) {
    return this.admin.setAgentVerified(viewer.userId as string, id, input.verified);
  }

  @Post('agents/:id/status')
  async setStatus(
    @CurrentViewer() viewer: Viewer,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(zodBody(setStatusSchema)) input: z.infer<typeof setStatusSchema>,
  ) {
    return this.admin.setAgentStatus(viewer.userId as string, id, input.status);
  }

  @Get('reports')
  async reports(@Query('months') months?: string) {
    const window = Number(months ?? 6);
    return this.admin.reports([3, 6, 12].includes(window) ? window : 6);
  }

  @Get('listings')
  async listings(
    @Query('city') city?: string,
    @Query('purpose') purpose?: PropertyPurpose,
    @Query('type') type?: PropertyType,
    @Query('status') status?: PropertyStatus,
  ) {
    return this.admin.listings({
      ...(city ? { city } : {}),
      ...(purpose ? { purpose } : {}),
      ...(type ? { type } : {}),
      ...(status ? { status } : {}),
    });
  }

  @Post('listings/:id/status')
  async setListingStatus(
    @CurrentViewer() viewer: Viewer,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(zodBody(setListingStatusSchema)) input: z.infer<typeof setListingStatusSchema>,
  ) {
    return this.admin.setListingStatus(viewer.userId as string, id, input.status);
  }
}
