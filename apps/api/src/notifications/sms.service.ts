import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * SMS goes through a local Pakistani aggregator, not Twilio — international
 * routes to +92 are expensive and get filtered.
 *
 * Note on Urdu: many aggregators bill Urdu text as Unicode (70 chars/segment
 * instead of 160), so an Urdu SMS can cost 2-3x a Latin one. Keep templates
 * short; the detail belongs in the in-app notification.
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private readonly config: ConfigService) {}

  async send(phone: string, text: string): Promise<void> {
    const provider = this.config.get<string>('SMS_PROVIDER') ?? 'console';

    if (provider === 'console') {
      this.logger.log(`[SMS→${phone}] ${text}`);
      return;
    }

    // TODO(M2): wire the chosen aggregator's HTTP API here. Keep the interface
    // this narrow so swapping providers is a one-file change.
    this.logger.warn(`SMS provider "${provider}" is not implemented yet; message dropped`);
  }
}
