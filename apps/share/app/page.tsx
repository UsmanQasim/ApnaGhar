import type { Metadata } from 'next';

import { colors, radius, roles, spacing } from '@ghar/ui';

import { LanguageSwitcher } from '../src/LanguageSwitcher';
import { copyFor } from '../src/copy';
import { getLocale } from '../src/locale';

/**
 * Landing page for the share host.
 *
 * Without this file the app has no `/` route and the domain answers a bare
 * Next.js 404 — which looks broken to anyone who trims a share link back to
 * the domain, or who lands here from a copy-pasted URL that lost its token.
 *
 * There is deliberately nothing to browse here. This host exists to render one
 * private listing per token; a directory of listings would defeat the point of
 * links that expire and can be revoked.
 */

export const metadata: Metadata = {
  // Static, and therefore in the default locale: metadata is generated once
  // and this host is not indexed anyway.
  title: 'گھر — شیئر لنک',
  // Same posture as /s/[token]: this host is not for search engines.
  robots: { index: false, follow: false },
};

const WEB_URL = process.env['WEB_BASE_URL'] ?? 'https://apna-ghar-web.vercel.app';

export default async function ShareIndexPage() {
  const locale = await getLocale();
  const C = copyFor(locale);

  return (
    <main style={page}>
      <h1 style={heading}>{C.brand}</h1>

      <p style={body}>{C.index.intro}</p>

      <div style={sample}>
        <span style={sampleLabel}>{C.index.linkShapeLabel}</span>
        <code style={sampleCode}>/s/xxxxxxxxxxxx</code>
      </div>

      <p style={subtle}>{C.index.troubleshoot}</p>

      <a href={WEB_URL} style={primaryButton}>
        {C.index.visitWebsite}
      </a>

      <div style={{ marginTop: spacing.lg }}>
        <LanguageSwitcher active={locale} label={C.language} />
      </div>
    </main>
  );
}

// Inline styles, matching /s/[token]: this host serves two small routes and a
// separate stylesheet would be a render-blocking request on mobile data.
const page: React.CSSProperties = {
  maxWidth: 560,
  margin: '0 auto',
  padding: spacing.md,
  background: colors.surface,
  color: colors.onSurface,
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  gap: spacing.sm,
};

const heading: React.CSSProperties = {
  fontSize: 24,
  margin: `${spacing.lg}px 0 0`,
};

const body: React.CSSProperties = { fontSize: 16, margin: 0 };

const subtle: React.CSSProperties = {
  color: colors.onSurfaceVariant,
  fontSize: 16,
  margin: 0,
};

const sample: React.CSSProperties = {
  background: roles.cardBackground,
  border: `1px solid ${roles.cardBorder}`,
  borderRadius: radius.md,
  padding: spacing.sm,
  display: 'flex',
  flexDirection: 'column',
  gap: spacing.base,
};

const sampleLabel: React.CSSProperties = {
  fontSize: 14,
  color: colors.onSurfaceVariant,
};

const sampleCode: React.CSSProperties = {
  // Latin path, so force LTR inside an RTL page or the slashes jump around.
  direction: 'ltr',
  textAlign: 'left',
  fontFamily: "'Plus Jakarta Sans', ui-monospace, monospace",
  fontWeight: 700,
  fontSize: 16,
};

const primaryButton: React.CSSProperties = {
  minHeight: spacing.touchTarget,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: radius.md,
  textDecoration: 'none',
  fontSize: 18,
  background: colors.primary,
  color: colors.onPrimary,
  marginTop: spacing.sm,
};
