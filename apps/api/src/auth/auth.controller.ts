import { Body, Controller, Headers, Patch, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';

import { otpRequestSchema, otpVerifySchema, updateLocaleSchema } from '@ghar/shared';

import { CurrentViewer, Public } from '../common/auth.guard';
import { zodBody } from '../common/zod.pipe';
import { AuthService } from './auth.service';

const refreshSchema = z.object({ refreshToken: z.string().min(10) });
const becomeAgentSchema = z.object({
  agencyName: z.string().trim().max(160).optional(),
  city: z.string().trim().max(80).optional(),
});

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /**
   * Tight rate limit: every call costs a real SMS. 3 per minute per IP on top
   * of the per-phone cooldown enforced in OtpService.
   */
  @Public()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post('otp/request')
  async requestOtp(@Body(zodBody(otpRequestSchema)) input: { phone: string }) {
    return this.auth.requestOtp(input.phone);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('otp/verify')
  async verifyOtp(
    @Body(zodBody(otpVerifySchema)) input: z.infer<typeof otpVerifySchema>,
    @Headers('user-agent') userAgent: string | undefined,
  ) {
    return this.auth.verifyOtp(input, userAgent ?? null);
  }

  @Public()
  @Post('refresh')
  async refresh(
    @Body(zodBody(refreshSchema)) input: { refreshToken: string },
    @Headers('user-agent') userAgent: string | undefined,
  ) {
    return this.auth.refresh(input.refreshToken, userAgent ?? null);
  }

  @Public()
  @Post('logout')
  async logout(@Body(zodBody(refreshSchema)) input: { refreshToken: string }) {
    await this.auth.logout(input.refreshToken);
    return { ok: true };
  }

  /**
   * Keep the account's language in step with the app's. Authenticated, and
   * scoped to the caller only — locale is a user preference, never an admin
   * action.
   */
  @Patch('locale')
  async setLocale(
    @CurrentViewer() viewer: { userId: string | null },
    @Body(zodBody(updateLocaleSchema)) input: z.infer<typeof updateLocaleSchema>,
  ) {
    return this.auth.setLocale(viewer.userId as string, input.locale);
  }

  @Post('become-agent')
  async becomeAgent(
    @CurrentViewer() viewer: { userId: string | null },
    @Body(zodBody(becomeAgentSchema)) input: z.infer<typeof becomeAgentSchema>,
  ) {
    return this.auth.becomeAgent(viewer.userId as string, input.agencyName ?? null, input.city ?? null);
  }
}
