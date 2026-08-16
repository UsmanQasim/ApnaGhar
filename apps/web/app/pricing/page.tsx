import Link from 'next/link';

import {
  EXTRA_LISTING_FEE_PAISA,
  PLANS,
  PlanCode,
  premiumBreakEvenListings,
} from '@ghar/shared';
import { colors, radius, spacing } from '@ghar/ui';

import { C } from '../../src/copy';
import { Section, cardStyle, primaryLinkStyle } from '../../src/components/chrome';

export const metadata = { title: `${C.nav.pricing} — ${C.brand}` };

function rupees(paisa: number): string {
  return `Rs ${(paisa / 100).toLocaleString('en-PK')}`;
}

/**
 * Pricing.
 *
 * ⚠️ This page deliberately does NOT match its Stitch export.
 *
 * The mock shows three tiers — Free Rs 0 / Standard Rs 5,000 / Premium
 * Rs 15,000 — with 5 and 20 listing caps. None of those numbers are the
 * product's. The real model (README §2) is Basic Rs 100/month with 3 included
 * listings and Rs 50 per extra listing, and Premium Rs 1,000/month unlimited.
 * The mock was generated before the pricing was settled, the same way
 * `agent_dashboard` still advertises "20 لسٹنگز" (docs/design/README.md §3).
 *
 * Everything below renders from `PLANS` and `EXTRA_LISTING_FEE_PAISA` in
 * @ghar/shared, so the public price page cannot drift from what the billing
 * engine actually charges. A marketing page quoting Rs 5,000 while the app
 * invoices Rs 100 is not a design inconsistency; it is a consumer-protection
 * problem.
 */
export default function PricingPage() {
  const breakEven = premiumBreakEvenListings();

  const plans = [
    {
      code: PlanCode.BASIC,
      name: C.plan.basic,
      blurb: C.pricing.basicFor,
      popular: false,
      features: [
        C.pricing.includedListings.replace(
          '{count}',
          String(PLANS[PlanCode.BASIC].includedListings ?? 0),
        ),
        C.pricing.extraFee.replace('{price}', rupees(EXTRA_LISTING_FEE_PAISA)),
        C.pricing.support,
      ],
    },
    {
      code: PlanCode.PREMIUM,
      name: C.plan.premium,
      blurb: C.pricing.premiumFor,
      popular: true,
      features: [
        C.pricing.unlimitedListings,
        C.pricing.noExtraFee,
        C.pricing.topPlacement,
        C.pricing.featuredBadge,
        C.pricing.insights,
        C.pricing.prioritySupport,
      ],
    },
  ] as const;

  return (
    <main>
      <Section title={C.pricing.title} subtitle={C.pricing.subtitle}>
        <div
          style={{
            display: 'grid',
            gap: spacing.md,
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            maxWidth: 900,
            margin: '0 auto',
          }}
        >
          {plans.map((plan) => (
            <article
              key={plan.code}
              style={{
                ...cardStyle,
                display: 'grid',
                gap: spacing.xs,
                borderColor: plan.popular ? colors.primary : undefined,
                borderWidth: plan.popular ? 2 : 1,
              }}
            >
              {plan.popular ? (
                <span
                  style={{
                    justifySelf: 'start',
                    background: colors.primary,
                    color: colors.onPrimary,
                    borderRadius: radius.full,
                    padding: `2px ${spacing.sm}px`,
                    fontSize: 14,
                  }}
                >
                  {C.pricing.mostPopular}
                </span>
              ) : null}

              <h3 style={{ margin: 0, fontSize: 24 }}>{plan.name}</h3>
              <p style={{ margin: 0, color: colors.onSurfaceVariant, fontSize: 16 }}>{plan.blurb}</p>

              <p style={{ margin: `${spacing.xs}px 0`, fontSize: 20 }}>
                <strong
                  style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontSize: 34,
                    direction: 'ltr',
                    display: 'inline-block',
                  }}
                >
                  {rupees(PLANS[plan.code].pricePaisa)}
                </strong>{' '}
                <span style={{ color: colors.onSurfaceVariant }}>{C.pricing.perMonth}</span>
              </p>

              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: spacing.xs }}>
                {plan.features.map((feature) => (
                  <li key={feature} style={{ display: 'flex', gap: spacing.xs, fontSize: 16 }}>
                    <span aria-hidden style={{ color: colors.primary }}>
                      ✓
                    </span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Link href="/#download" style={{ ...primaryLinkStyle, marginTop: spacing.xs }}>
                {plan.popular ? C.pricing.choose : C.pricing.start}
              </Link>
            </article>
          ))}
        </div>

        {/* Computed from the pricing engine, never typed in. If premium ever
            gets a listing cap this becomes Infinity, the shared package's test
            fails, and this line disappears rather than lying. */}
        {Number.isFinite(breakEven) ? (
          <p style={{ textAlign: 'center', marginTop: spacing.lg, fontSize: 17 }}>
            {C.pricing.breakEvenNote.replace('{count}', String(breakEven))}
          </p>
        ) : null}

        <p
          style={{
            textAlign: 'center',
            maxWidth: 620,
            margin: `${spacing.xs}px auto 0`,
            color: colors.onSurfaceVariant,
            fontSize: 16,
          }}
        >
          {C.pricing.honestNote}
        </p>
      </Section>
    </main>
  );
}
