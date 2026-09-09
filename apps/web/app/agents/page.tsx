import Link from 'next/link';

import { PLANS, PlanCode, premiumBreakEvenListings } from '@ghar/shared';

import { C, copyFor } from '../../src/copy';
import { getLocale } from '../../src/locale';
import { FeatureCard, Grid, Section, primaryLinkStyle, secondaryLinkStyle } from '../../src/components/chrome';
import { ChartIcon, LayersIcon, MicIcon, SparkIcon } from '../../src/components/icons';

// Module scope: metadata is generated per build, not per request, so it
// cannot read the locale cookie. `C` is the default (Urdu) set.
export const metadata = { title: `${C.nav.agents} — ${C.brand}` };

function rupees(paisa: number): string {
  return `Rs ${(paisa / 100).toLocaleString('en-PK')}`;
}

/**
 * For agents.
 *
 * The Stitch export leads with "اپنی سیلز میں 3 گنا اضافہ کریں" — a 3x sales
 * claim. It is not here: nothing in the product measures it, no cohort has
 * produced it, and an agent who is promised 3x and gets 1.2x churns angrier
 * than one who was promised nothing. The page leads with what the product
 * actually does instead, and with the real price.
 */
export default async function AgentsPage() {
  // Per request, not module scope: the visitor's language is a cookie.
  const C = copyFor(await getLocale());

  const breakEven = premiumBreakEvenListings();

  return (
    <main className="flex-1">
      <section className="ambient section">
        <div className="shell max-w-[880px] text-center">
          <h1 className="m-0 text-[clamp(28px,4.6vw,44px)] font-bold tracking-tight text-on-surface">
            {C.agents.heroTitle}
          </h1>
          <p className="mx-auto mt-sm max-w-[56ch] text-[18px] text-on-surface-variant">
            {C.agents.heroSub}
          </p>

          {/*
           * The price, on the hero. An agent deciding whether to register
           * should not have to hunt for it on another page.
           *
           * The amount and the "/ month" suffix are separate isolated runs.
           * Left as one string, the slash in "Rs 100 / ماہ" is placed by the
           * bidi algorithm relative to whichever neighbour wins, and it ends
           * up on the wrong side of the number.
           */}
          <p className="mt-md mb-lg flex items-baseline justify-center gap-1.5 text-[22px]">
            <strong className="numeric text-[28px] font-bold text-on-surface">
              {rupees(PLANS[PlanCode.BASIC].pricePaisa)}
            </strong>
            <span className="text-on-surface-variant">{C.pricing.perMonth}</span>
          </p>

          <div className="flex flex-wrap justify-center gap-sm">
            <Link href="/#download" className={primaryLinkStyle}>
              {C.home.registerAsAgent}
            </Link>
            <Link href="/pricing" className={secondaryLinkStyle}>
              {C.nav.pricing}
            </Link>
          </div>
        </div>
      </section>

      <Section title={C.agents.toolsTitle}>
        <Grid>
          <FeatureCard
            icon={<SparkIcon />}
            title={C.agents.premiumListings}
            body={C.agents.premiumListingsBody}
          />
          <FeatureCard
            icon={<ChartIcon />}
            title={C.agents.dashboardAnalytics}
            body={C.agents.dashboardAnalyticsBody}
          />
          <FeatureCard
            icon={<LayersIcon />}
            title={C.agents.demandInsights}
            body={C.agents.demandInsightsBody}
          />
          <FeatureCard
            icon={<MicIcon />}
            title={C.agents.voiceListing}
            body={C.agents.voiceListingBody}
          />
        </Grid>
      </Section>

      <Section tone="raised">
        <div className="card mx-auto max-w-[720px] p-xl text-center">
          <h2 className="m-0 text-[clamp(20px,2.8vw,28px)] font-bold tracking-tight">
            {C.agents.joinTitle}
          </h2>
          {Number.isFinite(breakEven) ? (
            <p className="mx-auto mt-sm mb-lg max-w-[52ch] text-[17px] text-on-surface-variant">
              {C.pricing.breakEvenNote.replace('{count}', String(breakEven))}
            </p>
          ) : null}
          <Link href="/#download" className={primaryLinkStyle}>
            {C.home.registerAsAgent}
          </Link>
        </div>
      </Section>
    </main>
  );
}
