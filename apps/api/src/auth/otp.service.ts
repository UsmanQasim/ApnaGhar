import { createHash, randomInt, timingSafeEqual } from 'node:crypto';

import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

import { SmsService } from '../notifications/sms.service';

interface OtpRecord {
  hash: string;
  attempts: number;
  createdAt: number;
}

/**
 * Phone + OTP is the only login. Nobody in this market signs in with email, and
 * asking for a password is a drop-off cliff for a semi-literate user.
 *
 * Codes are stored HASHED in Redis with a TTL — a Redis dump should not hand
 * anyone a working login code.
 */
@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private readonly redis: Redis;

  constructor(
    private readonly config: ConfigService,
    private readonly sms: SmsService,
  ) {
    this.redis = new Redis(this.config.getOrThrow<string>('REDIS_URL'));
  }

  private key(phone: string): string {
    return `otp:${phone}`;
  }

  private cooldownKey(phone: string): string {
    return `otp:cooldown:${phone}`;
  }

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

    const existingCooldown = await this.redis.ttl(this.cooldownKey(phone));
    if (existingCooldown > 0) {
      throw new BadRequestException({
        code: 'otp_cooldown',
        resendInSeconds: existingCooldown,
      });
    }

    const ttl = Number(this.config.get<string>('OTP_TTL_SECONDS') ?? '300');
    const code = this.devMode
      ? (this.config.get<string>('OTP_DEV_CODE') ?? '123456')
      : String(randomInt(0, 1_000_000)).padStart(6, '0');

    const record: OtpRecord = {
      hash: this.hash(phone, code),
      attempts: 0,
      createdAt: Date.now(),
    };

    await this.redis.set(this.key(phone), JSON.stringify(record), 'EX', ttl);
    await this.redis.set(this.cooldownKey(phone), '1', 'EX', cooldown);

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
    const raw = await this.redis.get(this.key(phone));
    if (!raw) throw new BadRequestException({ code: 'otp_expired' });

    const record = JSON.parse(raw) as OtpRecord;
    const maxAttempts = Number(this.config.get<string>('OTP_MAX_ATTEMPTS') ?? '5');

    if (record.attempts >= maxAttempts) {
      await this.redis.del(this.key(phone));
      throw new BadRequestException({ code: 'otp_too_many_attempts' });
    }

    const expected = Buffer.from(record.hash);
    const actual = Buffer.from(this.hash(phone, code));
    const matches = expected.length === actual.length && timingSafeEqual(expected, actual);

    if (!matches) {
      record.attempts += 1;
      const ttl = await this.redis.ttl(this.key(phone));
      await this.redis.set(this.key(phone), JSON.stringify(record), 'EX', Math.max(ttl, 1));
      return false;
    }

    await this.redis.del(this.key(phone));
    return true;
  }
}
