import { colors, radius, spacing } from '@ghar/ui';

import { C } from '../../src/copy';
import { Section, cardStyle } from '../../src/components/chrome';
import { ContactForm } from './contact-form';

export const metadata = { title: `${C.nav.contact} — ${C.brand}` };

const FAQ = [
  { q: C.contact.faq1Q, a: C.contact.faq1A },
  { q: C.contact.faq2Q, a: C.contact.faq2A },
  { q: C.contact.faq3Q, a: C.contact.faq3A },
] as const;

export default function ContactPage() {
  return (
    <main>
      <Section title={C.contact.title} subtitle={C.contact.subtitle}>
        <div style={{ display: 'grid', gap: spacing.md, gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
          <div style={cardStyle}>
            <h2 style={{ margin: `0 0 ${spacing.sm}px`, fontSize: 22 }}>{C.contact.sendMessage}</h2>
            <ContactForm />
          </div>

          <div style={{ display: 'grid', gap: spacing.md, alignContent: 'start' }}>
            <div style={cardStyle}>
              <h3 style={{ margin: 0, fontSize: 19 }}>
                <span aria-hidden>📍</span> {C.contact.headOffice}
              </h3>
              <p style={{ margin: `${spacing.base}px 0 0`, color: colors.onSurfaceVariant, fontSize: 16 }}>
                {C.contact.address}
              </p>
            </div>

            <div style={cardStyle}>
              <h3 style={{ margin: 0, fontSize: 19 }}>
                <span aria-hidden>📞</span> {C.contact.phoneAndEmail}
              </h3>
              {/* Both render LTR: a mirrored phone number is a wrong number. */}
              <p
                style={{
                  margin: `${spacing.base}px 0 0`,
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  direction: 'ltr',
                  textAlign: 'start',
                  fontSize: 16,
                }}
              >
                +92 309 5307723
                <br />
                1998Usman@gmail.com
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* ── FAQ ───────────────────────────────────────────────────────────
          Native <details>, so it opens without JavaScript. */}
      <Section title={C.contact.faqTitle} tone="raised">
        <div style={{ maxWidth: 780, margin: '0 auto', display: 'grid', gap: spacing.xs }}>
          {FAQ.map((item) => (
            <details key={item.q} style={{ ...cardStyle, borderRadius: radius.md }}>
              <summary style={{ cursor: 'pointer', fontSize: 18, minHeight: spacing.touchTarget, display: 'flex', alignItems: 'center' }}>
                {item.q}
              </summary>
              <p style={{ margin: `${spacing.xs}px 0 0`, color: colors.onSurfaceVariant, fontSize: 16 }}>
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </Section>
    </main>
  );
}
