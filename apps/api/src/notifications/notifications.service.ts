import { Injectable, Logger } from '@nestjs/common';

import { Locale } from '@ghar/shared';
import { en, ur } from '@ghar/i18n';

import { PrismaService } from '../common/prisma.service';
import { SmsService } from './sms.service';

type Payload = Record<string, unknown> & { alsoSms?: boolean };

/**
 * Notifications are always rendered in the RECIPIENT's locale, not the
 * sender's, and never in English by default. `type` is a dotted key into the
 * locale files, so a notification can never ship without an Urdu string —
 * the i18n parity check would fail the build first.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sms: SmsService,
  ) {}

  async send(userId: string, type: string, payload: Payload): Promise<void> {
    const { alsoSms, ...data } = payload;

    await this.prisma.notification.create({
      data: { userId, type, payload: data as object },
    });

    if (!alsoSms) return;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true, locale: true },
    });
    if (!user) return;

    const text = this.render(type, data, user.locale as Locale);
    if (text) await this.sms.send(user.phone, text);
  }

  /** Resolve a dotted key from the locale bundle and interpolate {{vars}}. */
  private render(type: string, data: Record<string, unknown>, locale: Locale): string | null {
    const bundle: unknown = locale === Locale.EN ? en : ur;
    const template = type.split('.').reduce<unknown>(
      (acc, part) =>
        acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[part] : undefined,
      bundle,
    );

    if (typeof template !== 'string') {
      this.logger.warn(`No ${locale} string for notification type "${type}"`);
      return null;
    }

    return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => String(data[key] ?? ''));
  }
}
