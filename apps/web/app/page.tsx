import Link from 'next/link';

import { colors, radius, spacing } from '@ghar/ui';

import { C } from '../src/copy';
import {
  FeatureCard,
  Grid,
  Section,
  cardStyle,
  primaryLinkStyle,
  secondaryLinkStyle,
} from '../src/components/chrome';

/**
 * Marketing home.
 *
 * One departure from the Stitch export: the mock's "10K+ listings / 5K+ agents
 * / 1M+ visitors" band is not here. Those numbers are placeholders, and the
 * product launches in ONE city with 30–50 onboarded agents (README §15). A
 * marketplace whose landing page opens with a number it cannot back is the
 * fastest way to lose the trust the rest of the page is asking for. Put the
 * band back when the numbers are real — the layout leaves room for it.
 */
export default function HomePage() {
  return (
    <main>
      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section
        style={{
          background: `linear-gradient(180deg, ${colors.primaryFixed} 0%, ${colors.surface} 100%)`,
          padding: `${spacing.xl * 2}px ${spacing.md}px`,
        }}
      >
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          <h1 style={{ margin: 0, fontSize: 44, lineHeight: 1.6 }}>
            {C.home.heroLine1}{' '}
            <span style={{ color: colors.primary }}>{C.home.heroHighlight}</span>{' '}
            {C.home.heroLine2}
          </h1>
          <p style={{ fontSize: 19, color: colors.onSurfaceVariant, maxWidth: 640, margin: `${spacing.md}px auto` }}>
            {C.home.heroSub}
          </p>

          <div style={{ display: 'flex', gap: spacing.sm, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="#download" style={primaryLinkStyle}>
              {C.nav.download}
            </Link>
            <Link href="/buyers" style={secondaryLinkStyle}>
              {C.home.seeListings}
            </Link>
          </div>
        </div>
      </section>

      {/* ── For buyers ────────────────────────────────────────────────── */}
      <Section title={C.home.buyersTitle} subtitle={C.home.buyersSub}>
        <Grid>
          <FeatureCard icon="🎥" title={C.home.videoTours} body={C.home.videoToursBody} />
          <FeatureCard icon="✅" title={C.home.verifiedAgents} body={C.home.verifiedAgentsBody} />
          <FeatureCard icon="💬" title={C.home.directContact} body={C.home.directContactBody} />
          <FeatureCard icon="🎤" title={C.home.voiceSearch} body={C.home.voiceSearchBody} />
        </Grid>
      </Section>

      {/* ── For agents ────────────────────────────────────────────────── */}
      <Section title={C.home.agentsTitle} subtitle={C.home.agentsSub} tone="raised">
        <Grid min={280}>
          <FeatureCard icon="⭐" title={C.home.premiumLeads} body={C.home.premiumLeadsBody} />
          <FeatureCard icon="📈" title={C.home.analytics} body={C.home.analyticsBody} />
          <FeatureCard icon="⚡" title={C.home.fasterSales} body={C.home.fasterSalesBody} />
        </Grid>

        <div style={{ textAlign: 'center', marginTop: spacing.lg }}>
          <Link href="/agents" style={primaryLinkStyle}>
            {C.home.registerAsAgent}
          </Link>
        </div>
      </Section>

      {/* ── Download ──────────────────────────────────────────────────── */}
      <Section id="download">
        <div
          style={{
            ...cardStyle,
            textAlign: 'center',
            background: colors.inverseSurface,
            borderColor: colors.inverseSurface,
            color: colors.inverseOnSurface,
            padding: spacing.xl,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 30 }}>{C.home.downloadTitle}</h2>
          <p style={{ maxWidth: 620, margin: `${spacing.sm}px auto ${spacing.lg}px`, opacity: 0.9, fontSize: 17 }}>
            {C.home.downloadBody}
          </p>

          <div style={{ display: 'flex', gap: spacing.sm, justifyContent: 'center', flexWrap: 'wrap' }}>
            {/* Store links are placeholders until the app ships — pointed at
                the contact page rather than a dead store URL, because a broken
                store link on the landing page reads as an abandoned product. */}
            <Link
              href="/contact"
              style={{
                ...primaryLinkStyle,
                background: colors.surfaceContainerLowest,
                color: colors.onSurface,
              }}
            >
              Google Play
            </Link>
            <Link
              href="/contact"
              style={{
                ...primaryLinkStyle,
                background: 'transparent',
                border: `1px solid ${colors.inverseOnSurface}`,
                color: colors.inverseOnSurface,
                borderRadius: radius.md,
              }}
            >
              App Store
            </Link>
          </div>
        </div>
      </Section>
    </main>
  );
}
