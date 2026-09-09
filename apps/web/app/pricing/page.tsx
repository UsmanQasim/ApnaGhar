import Link from 'next/link';

import {
  EXTRA_LISTING_FEE_PAISA,
  PLANS,
  PlanCode,
  premiumBreakEvenListings,
} from '@ghar/shared';
import { C, copyFor } from '../../src/copy';
import { getLocale } from '../../src/locale';
import { Section, primaryLinkStyle, secondaryLinkStyle } from '../../src/components/chrome';
import { CheckIcon } from '../../src/components/icons';

// Module scope: metadata is generated per build, not per request, so it
// cannot read the locale cookie. `C` is the default (Urdu) set.
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
export default async function PricingPage() {
  // Per request, not module scope: the visitor's language is a cookie.
  const C = copyFor(await getLocale());

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
    <main className="flex-1">
      <Section title={C.pricing.title} subtitle={C.pricing.subtitle} tone="ambient">
        {/*
         * `items-stretch` plus a column layout inside each card is what keeps
         * the two CTAs on the same line. Previously the shorter Basic card
         * ended wherever its feature list ran out, so the two buttons sat at
         * different heights — the clearest single sign that a pricing table
         * was not designed.
         */}
        <div className="mx-auto grid max-w-[920px] items-stretch gap-md md:grid-cols-2">
          {plans.map((plan) => (
            <article
              key={plan.code}
              className={[
                'card flex h-full flex-col p-lg',
                plan.popular ? 'border-2 border-primary' : '',
              ].join(' ')}
            >
              {/* Reserved whether or not the badge shows, so both cards start
                  their title on the same line. */}
              <div className="h-7">
                {plan.popular ? (
                  <span className="inline-block rounded-full bg-primary px-sm py-0.5 text-sm font-semibold text-on-primary">
                    {C.pricing.mostPopular}
                  </span>
                ) : null}
              </div>

              <h3 className="mt-xs mb-0 text-[22px] font-bold tracking-tight">{plan.name}</h3>
              <p className="mt-1 mb-md text-[15px] text-on-surface-variant">{plan.blurb}</p>

              {/*
               * Amount and period as separate isolated runs. As one string,
               * the slash in "Rs 1,000 / ماہ" is placed by the bidi algorithm
               * relative to whichever neighbour wins, and it lands on the
               * wrong side of the number — which is exactly how this rendered
               * before.
               */}
              <p className="m-0 flex items-baseline gap-1.5">
                <strong className="numeric text-[34px] font-bold leading-none tracking-tight text-on-surface">
                  {rupees(PLANS[plan.code].pricePaisa)}
                </strong>
                <span className="text-[15px] text-on-surface-variant">{C.pricing.perMonth}</span>
              </p>

              <ul className="mt-lg mb-lg grid list-none gap-sm p-0">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-xs text-[15px]">
                    <span className="mt-0.5 shrink-0 text-primary">
                      <CheckIcon />
                    </span>
                    <span className="min-w-0">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* `mt-auto` pins the CTA to the bottom of whichever card is
                  taller, so both align. */}
              <Link
                href="/#download"
                className={`mt-auto w-full ${plan.popular ? primaryLinkStyle : secondaryLinkStyle}`}
              >
                {plan.popular ? C.pricing.choose : C.pricing.start}
              </Link>
            </article>
          ))}
        </div>

        <div className="mx-auto mt-lg grid max-w-[62ch] gap-xs text-center">
          {Number.isFinite(breakEven) ? (
            <p className="m-0 text-[15px] font-medium text-on-surface">
              {C.pricing.breakEvenNote.replace('{count}', String(breakEven))}
            </p>
          ) : null}
          <p className="m-0 text-[15px] text-on-surface-variant">{C.pricing.honestNote}</p>
        </div>
      </Section>
    </main>
  );
}
