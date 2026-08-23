import { createHash, randomInt, timingSafeEqual } from 'node:crypto';

import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PrismaService } from '../common/prisma.service';
import { SmsService } from '../notifications/sms.service';

/**
 * Phone + OTP is the only login. Nobody in this market signs in with email, and
 * asking for a password is a drop-off cliff for a semi-literate user.
 *
 * Codes are stored HASHED — a database dump should not hand anyone a working
 * login code.
 *
 * Previously backed by Redis. Postgres now holds these instead, which is the
 * change that let the whole API move to serverless: Redis was the only thing
 * here that required an always-on process to connect to. The behaviour is
 * deliberately identical — same hash, same TTL, same attempt cap, same resend
 * cooldown — with expiry enforced in the WHERE clause rather than by a key TTL.
 */
@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly sms: SmsService,
  ) {}

  private hash(phone: string, code: string): string {
    return createHash('sha256')
      .update(`${phone}:${code}:${this.config.getOrThrow<string>('JWT_SECRET')}`)
      .digest('hex');
  }

  private get devMode(): boolean {
    return this.config.get<string>('OTP_DEV_MODE') === 'true';
  }

  async request(phone: string): Promise<{ devCode?: string; resendInSeconds: number }> {
    const cooldown = Number(this.config.get<string>('OTP_RESEND_COOLDOWN_SECONDS') ?? '60');
    const now = new Date();

    const existing = await this.prisma.otpCode.findUnique({
      where: { phone },
      select: { resendAfter: true },
    });

    if (existing && existing.resendAfter > now) {
      throw new BadRequestException({
        code: 'otp_cooldown',
        resendInSeconds: Math.ceil((existing.resendAfter.getTime() - now.getTime()) / 1000),
      });
    }

    const ttl = Number(this.config.get<string>('OTP_TTL_SECONDS') ?? '300');
    const code = this.devMode
      ? (this.config.get<string>('OTP_DEV_CODE') ?? '123456')
      : String(randomInt(0, 1_000_000)).padStart(6, '0');

    const record = {
      codeHash: this.hash(phone, code),
      attempts: 0,
      expiresAt: new Date(now.getTime() + ttl * 1000),
      resendAfter: new Date(now.getTime() + cooldown * 1000),
    };

    // Upsert, so requesting a second code replaces the first rather than
    // leaving two valid codes for one number.
    await this.prisma.otpCode.upsert({
      where: { phone },
      update: record,
      create: { phone, ...record },
    });

    if (this.devMode) {
      this.logger.debug(`[dev] OTP for ${phone} is ${code}`);
      return { devCode: code, resendInSeconds: cooldown };
    }

    // Deliberately short: Urdu SMS is billed as Unicode at 70 chars a segment.
    await this.sms.send(phone, `Ghar code: ${code}`);
    return { resendInSeconds: cooldown };
  }

  /**
   * Verify and burn. A correct code is deleted immediately so it cannot be
   * replayed, and the attempt counter caps brute force at 5 tries per code.
   */
  async verify(phone: string, code: string): Promise<boolean> {
    const record = await this.prisma.otpCode.findUnique({ where: { phone } });

    // An expired row is treated exactly as a missing one. It gets deleted here
    // rather than left to the sweep, so a stale row cannot be probed.
    if (!record || record.expiresAt <= new Date()) {
      if (record) await this.prisma.otpCode.delete({ where: { phone } }).catch(() => undefined);
      throw new BadRequestException({ code: 'otp_expired' });
    }

    const maxAttempts = Number(this.config.get<string>('OTP_MAX_ATTEMPTS') ?? '5');

    if (record.attempts >= maxAttempts) {
      await this.prisma.otpCode.delete({ where: { phone } });
      throw new BadRequestException({ code: 'otp_too_many_attempts' });
    }

    const expected = Buffer.from(record.codeHash);
    const actual = Buffer.from(this.hash(phone, code));
    const matches = expected.length === actual.length && timingSafeEqual(expected, actual);

    if (!matches) {
      // Note: expiresAt is untouched. A wrong guess must not extend the window.
      await this.prisma.otpCode.update({
        where: { phone },
        data: { attempts: { increment: 1 } },
      });
      return false;
    }

    await this.prisma.otpCode.delete({ where: { phone } });
    return true;
  }

  /**
   * Delete expired codes.
   *
   * Redis evicted these for free; Postgres does not. Called from the
   * maintenance endpoint on the same hourly schedule as the billing sweeps.
   * Skipping it is not a correctness problem — `verify` already rejects
   * anything past `expiresAt` — it just stops the table growing forever.
   */
  async sweepExpired(): Promise<number> {
    const { count } = await this.prisma.otpCode.deleteMany({
      where: { expiresAt: { lte: new Date() } },
    });
    return count;
  }
}
