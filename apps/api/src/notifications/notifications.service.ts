import { Injectable, Logger } from '@nestjs/common';

import { parseLocale, type Locale } from '@ghar/shared';
import { bundles } from '@ghar/i18n';

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

    // `locale` is a varchar, so an unexpected value is possible in principle;
    // parseLocale falls back to Urdu rather than to whichever bundle happens
    // to be first, and an SMS in the wrong language is worse than none.
    const text = this.render(type, data, parseLocale(user.locale));
    if (text) await this.sms.send(user.phone, text);
  }

  /**
   * Resolve a dotted key from the locale bundle and interpolate {{vars}}.
   *
   * Was `locale === EN ? en : ur`, which quietly sent Nastaliq SMS to anyone
   * who had chosen Roman Urdu — the locale most likely to have been chosen
   * BECAUSE their handset renders Nastaliq badly in SMS. Index the bundles
   * instead, so adding a locale cannot silently mis-route again.
   */
  private render(type: string, data: Record<string, unknown>, locale: Locale): string | null {
    const bundle: unknown = bundles[locale];
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
