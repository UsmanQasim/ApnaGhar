import { createHash, timingSafeEqual } from 'node:crypto';

import {
  Controller,
  Headers,
  HttpCode,
  Logger,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';

import { OtpService } from '../auth/otp.service';
import { DunningService } from '../billing/dunning.service';
import { Public } from './auth.guard';

/**
 * The scheduler, as an HTTP endpoint.
 *
 * `@nestjs/schedule` needs a process that stays alive between ticks. On
 * serverless there is no such process, so the schedule lives outside the app —
 * GitHub Actions calls this hourly (see .github/workflows/api-cron.yml).
 *
 * Free, no card, no expiry, and a failed run shows up as a red tick in the
 * Actions log rather than disappearing into a container's stdout.
 *
 * ── Why a shared secret and not the JWT guard ───────────────────────────────
 * The caller is a workflow, not a user. Minting an admin JWT for CI would mean
 * a long-lived admin token sitting in repository secrets — a much worse thing
 * to leak than a key whose only power is "run the billing sweep an hour early".
 */
@Controller('maintenance')
export class MaintenanceController {
  private readonly logger = new Logger(MaintenanceController.name);

  constructor(
    private readonly dunning: DunningService,
    private readonly otp: OtpService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Constant-time compare of SHA-256 digests.
   *
   * Hashing first means both buffers are always 32 bytes, so the comparison
   * cannot leak the secret's length — `timingSafeEqual` throws on a length
   * mismatch, and that throw is itself an oracle.
   */
  private authorize(header: string | undefined): void {
    const expected = this.config.get<string>('CRON_SECRET');

    // Fail closed. An unset secret must not mean an open endpoint.
    if (!expected) {
      this.logger.error('CRON_SECRET is not set — refusing to run maintenance');
      throw new UnauthorizedException('cron_secret_not_configured');
    }

    const a = createHash('sha256').update(header ?? '').digest();
    const b = createHash('sha256').update(expected).digest();

    if (!timingSafeEqual(a, b)) throw new UnauthorizedException('invalid_cron_secret');
  }

  /**
   * Runs every sweep. Safe to call at any frequency: each step selects rows by
   * state and moves them out of it, so a double run is a no-op and a missed run
   * is picked up by the next one.
   *
   * The daily-only jobs (reminders, dormancy) are included on every call
   * deliberately. `sendReminders` messages agents whose grace window is still
   * open, so running it hourly would spam them — the workflow calls this
   * endpoint hourly but passes the daily steps only once a day, at 05:00 UTC.
   * See the `steps` header.
   */
  @Public()
  // Tighter than the global 60/min: this endpoint does real database work and
  // has exactly one legitimate caller.
  @Throttle({ default: { limit: 6, ttl: 60_000 } })
  @HttpCode(200)
  @Post('run')
  async run(
    @Headers('x-cron-secret') secret: string | undefined,
    @Headers('x-cron-steps') steps: string | undefined,
  ): Promise<{ ok: true; ran: string[]; failed: string[] }> {
    this.authorize(secret);

    // Default to the hourly set. The workflow sends "all" once a day.
    const daily = (steps ?? 'hourly').toLowerCase() === 'all';

    const jobs: Array<[string, () => Promise<unknown>]> = [
      ['cycleClose', () => this.dunning.runCycleClose()],
      ['restrictions', () => this.dunning.applyRestrictions()],
      ['otpSweep', () => this.otp.sweepExpired()],
    ];

    if (daily) {
      jobs.push(['reminders', () => this.dunning.sendReminders()]);
      jobs.push(['dormancy', () => this.dunning.applyDormancy()]);
    }

    const ran: string[] = [];
    const failed: string[] = [];

    // Sequential, and one failure must not skip the rest — a broken SMS
    // provider should not stop overdue accounts being restricted.
    for (const [name, job] of jobs) {
      try {
        await job();
        ran.push(name);
      } catch (error) {
        failed.push(name);
        this.logger.error(`maintenance step "${name}" failed`, error as Error);
      }
    }

    this.logger.log(`maintenance ran=[${ran.join(', ')}] failed=[${failed.join(', ')}]`);
    return { ok: true, ran, failed };
  }
}
