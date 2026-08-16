import Link from 'next/link';

import { PLANS, PlanCode, premiumBreakEvenListings } from '@ghar/shared';
import { colors, spacing } from '@ghar/ui';

import { C } from '../../src/copy';
import { FeatureCard, Grid, Section, cardStyle, primaryLinkStyle, secondaryLinkStyle } from '../../src/components/chrome';

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
export default function AgentsPage() {
  const breakEven = premiumBreakEvenListings();

  return (
    <main>
      <section style={{ background: colors.primaryFixed, padding: `${spacing.xl * 1.5}px ${spacing.md}px` }}>
        <div style={{ maxWidth: 880, margin: '0 auto', textAlign: 'center' }}>
          <h1 style={{ margin: 0, fontSize: 40, lineHeight: 1.6 }}>{C.agents.heroTitle}</h1>
          <p style={{ fontSize: 19, color: colors.onSurfaceVariant, margin: `${spacing.md}px auto`, maxWidth: 640 }}>
            {C.agents.heroSub}
          </p>

          {/* The price, on the hero. An agent deciding whether to register
              should not have to hunt for it on another page. */}
          <p style={{ fontSize: 22, margin: `0 0 ${spacing.lg}px` }}>
            <strong style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", direction: 'ltr', display: 'inline-block' }}>
              {rupees(PLANS[PlanCode.BASIC].pricePaisa)}
            </strong>{' '}
            {C.pricing.perMonth}
          </p>

          <div style={{ display: 'flex', gap: spacing.sm, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/#download" style={primaryLinkStyle}>
              {C.home.registerAsAgent}
            </Link>
            <Link href="/pricing" style={secondaryLinkStyle}>
              {C.nav.pricing}
            </Link>
          </div>
        </div>
      </section>

      <Section title={C.agents.toolsTitle}>
        <Grid>
          <FeatureCard icon="⭐" title={C.agents.premiumListings} body={C.agents.premiumListingsBody} />
          <FeatureCard icon="📊" title={C.agents.dashboardAnalytics} body={C.agents.dashboardAnalyticsBody} />
          <FeatureCard icon="📈" title={C.agents.demandInsights} body={C.agents.demandInsightsBody} />
          <FeatureCard icon="🎤" title={C.agents.voiceListing} body={C.agents.voiceListingBody} />
        </Grid>
      </Section>

      <Section tone="raised">
        <div style={{ ...cardStyle, textAlign: 'center', padding: spacing.xl }}>
          <h2 style={{ margin: 0, fontSize: 28 }}>{C.agents.joinTitle}</h2>
          {Number.isFinite(breakEven) ? (
            <p style={{ color: colors.onSurfaceVariant, fontSize: 17, margin: `${spacing.sm}px 0 ${spacing.lg}px` }}>
              {C.pricing.breakEvenNote.replace('{count}', String(breakEven))}
            </p>
          ) : null}
          <Link href="/#download" style={primaryLinkStyle}>
            {C.home.registerAsAgent}
          </Link>
        </div>
      </Section>
    </main>
  );
}
