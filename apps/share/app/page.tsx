import type { Metadata } from 'next';

import { colors, radius, roles, spacing } from '@ghar/ui';

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
  title: 'گھر — شیئر لنک',
  // Same posture as /s/[token]: this host is not for search engines.
  robots: { index: false, follow: false },
};

const WEB_URL = process.env['WEB_BASE_URL'] ?? 'https://apna-ghar-web.vercel.app';

export default function ShareIndexPage() {
  return (
    <main dir="rtl" style={page}>
      <h1 style={heading}>گھر — شیئر لنک</h1>

      <p style={body}>
        یہ صفحہ صرف ان لنکس کے لیے ہے جو ایجنٹ آپ کو بھیجتے ہیں۔ ہر لنک ایک ہی
        پراپرٹی کھولتی ہے۔
      </p>

      <div style={sample}>
        <span style={sampleLabel}>لنک کی شکل</span>
        <code style={sampleCode}>/s/xxxxxxxxxxxx</code>
      </div>

      <p style={subtle}>
        اگر ایجنٹ کی بھیجی ہوئی لنک نہیں کھل رہی تو ممکن ہے اس کی مدت ختم ہو گئی
        ہو، ایجنٹ نے اسے بند کر دیا ہو، یا اسے دیکھنے کی حد پوری ہو چکی ہو۔ ایسی
        صورت میں ایجنٹ سے نئی لنک منگوائیں۔
      </p>

      <a href={WEB_URL} style={primaryButton}>
        گھر کی ویب سائٹ دیکھیں
      </a>
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
  fontFamily: "'Noto Nastaliq Urdu', serif",
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  gap: spacing.sm,
};

const heading: React.CSSProperties = {
  fontSize: 24,
  lineHeight: 2,
  margin: `${spacing.lg}px 0 0`,
};

const body: React.CSSProperties = { fontSize: 16, lineHeight: 2, margin: 0 };

const subtle: React.CSSProperties = {
  color: colors.onSurfaceVariant,
  fontSize: 16,
  lineHeight: 2,
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
