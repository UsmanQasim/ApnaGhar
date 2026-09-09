import Link from 'next/link';

import { colors, radius, roles, spacing } from '@ghar/ui';

import { C, copyFor, type WebCopy } from '../../src/copy';
import { getLocale } from '../../src/locale';
import { FeatureCard, Grid, Section, cardStyle, primaryLinkStyle } from '../../src/components/chrome';

// Module scope: metadata is generated per build, not per request, so it
// cannot read the locale cookie. `C` is the default (Urdu) set.
export const metadata = { title: `${C.nav.buyers} — ${C.brand}` };

/** Per request: these labels are locale-dependent. */
function stepsFor(C: WebCopy) {
  return [
    { n: 1, title: C.buyers.step1, body: C.buyers.step1Body },
    { n: 2, title: C.buyers.step2, body: C.buyers.step2Body },
    { n: 3, title: C.buyers.step3, body: C.buyers.step3Body },
    { n: 4, title: C.buyers.step4, body: C.buyers.step4Body },
  ] as const;
}

/**
 * For buyers.
 *
 * Two claims from the Stitch export are deliberately absent, because the
 * product does not do them and a marketing page must not promise what the app
 * will not deliver:
 *
 *  • "ہماری ٹیم ہر پراپرٹی کی فزیکل تصدیق کرتی ہے" — there is no physical
 *    inspection process. Agents are verified; individual properties are not.
 *  • "ہمارے قانونی ماہرین خریداری کے عمل میں رہنمائی کرتے ہیں" — there is no
 *    legal service.
 *
 * What replaces them is a claim the product does keep: the buyer's number is
 * not handed to an agent until the buyer makes contact (see EngagementService).
 */
export default async function BuyersPage() {
  // Per request, not module scope: the visitor's language is a cookie.
  const C = copyFor(await getLocale());
  const STEPS = stepsFor(C);

  return (
    <main>
      <section style={{ background: colors.primaryFixed, padding: `${spacing.xl * 1.5}px ${spacing.md}px` }}>
        <div style={{ maxWidth: 880, margin: '0 auto', textAlign: 'center' }}>
          <h1 style={{ margin: 0, fontSize: 40, lineHeight: 1.6 }}>
            {C.buyers.heroLine1}
            <br />
            <span style={{ color: colors.primary }}>{C.buyers.heroLine2}</span>
          </h1>
          <div style={{ marginTop: spacing.lg }}>
            <Link href="/#download" style={primaryLinkStyle}>
              {C.buyers.searchCta}
            </Link>
          </div>
        </div>
      </section>

      {/* ── Video first ───────────────────────────────────────────────── */}
      <Section>
        <div style={{ display: 'grid', gap: spacing.lg, gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', alignItems: 'center' }}>
          <div>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: spacing.base,
                background: colors.secondaryContainer,
                borderRadius: radius.full,
                padding: `4px ${spacing.sm}px`,
                fontSize: 14,
              }}
            >
              <span aria-hidden>🎥</span>
              {C.buyers.videoFirstEyebrow}
            </span>
            <h2 style={{ fontSize: 30, margin: `${spacing.xs}px 0` }}>{C.buyers.videoFirstTitle}</h2>
            <p style={{ color: colors.onSurfaceVariant, fontSize: 17 }}>{C.buyers.videoFirstBody}</p>

            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: spacing.sm }}>
              {[
                { title: C.buyers.saveTime, body: C.buyers.saveTimeBody },
                { title: C.buyers.realFootage, body: C.buyers.realFootageBody },
              ].map((item) => (
                <li key={item.title} style={{ display: 'flex', gap: spacing.xs }}>
                  <span aria-hidden style={{ color: colors.primary, fontSize: 20 }}>
                    ✓
                  </span>
                  <div>
                    <strong style={{ fontSize: 17 }}>{item.title}</strong>
                    <p style={{ margin: 0, color: colors.onSurfaceVariant, fontSize: 16 }}>{item.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div
            style={{
              ...cardStyle,
              minHeight: 260,
              display: 'grid',
              placeItems: 'center',
              background: colors.surfaceContainerHigh,
              borderColor: roles.cardBorder,
            }}
          >
            <span aria-hidden style={{ fontSize: 56 }}>
              ▶️
            </span>
          </div>
        </div>
      </Section>

      {/* ── Trust ─────────────────────────────────────────────────────── */}
      <Section title={C.buyers.promiseTitle} subtitle={C.buyers.promiseBody} tone="raised">
        <Grid>
          <FeatureCard icon="✅" title={C.home.verifiedAgents} body={C.buyers.verifiedAgentsBody} />
          <FeatureCard icon="🛡️" title={C.buyers.privacyTitle} body={C.buyers.privacyBody} />
        </Grid>
      </Section>

      {/* ── How it works ──────────────────────────────────────────────── */}
      <Section title={C.buyers.howTitle}>
        <Grid min={230}>
          {STEPS.map((step) => (
            <article key={step.n} style={{ ...cardStyle, display: 'grid', gap: spacing.xs }}>
              <span
                aria-hidden
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: radius.full,
                  background: colors.primary,
                  color: colors.onPrimary,
                  display: 'grid',
                  placeItems: 'center',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 700,
                }}
              >
                {step.n}
              </span>
              <h3 style={{ margin: 0, fontSize: 19 }}>{step.title}</h3>
              <p style={{ margin: 0, color: colors.onSurfaceVariant, fontSize: 16 }}>{step.body}</p>
            </article>
          ))}
        </Grid>
      </Section>
    </main>
  );
}
