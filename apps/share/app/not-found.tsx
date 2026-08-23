import { colors, radius, roles, spacing } from '@ghar/ui';

/**
 * 404 for the share host — e.g. a truncated link, or a path that is not /s/….
 *
 * Deliberately says nothing about whether a token exists. "Not found" and
 * "revoked" must look identical from outside, or the 404 becomes an oracle for
 * guessing valid tokens.
 */
export default function NotFound() {
  return (
    <main dir="rtl" style={page}>
      <h1 style={heading}>لنک نہیں ملی</h1>

      <div style={warning}>
        یہ لنک درست نہیں ہے، یا اس کی مدت ختم ہو چکی ہے۔
      </div>

      <p style={subtle}>
        براہِ کرم ایجنٹ کی بھیجی ہوئی مکمل لنک دوبارہ کھولیں، یا ان سے نئی لنک
        منگوائیں۔
      </p>
    </main>
  );
}

const page: React.CSSProperties = {
  maxWidth: 560,
  margin: '0 auto',
  padding: spacing.md,
  background: colors.surface,
  color: colors.onSurface,
  fontFamily: "'Noto Nastaliq Urdu', serif",
  minHeight: '100vh',
};

const heading: React.CSSProperties = { fontSize: 24, lineHeight: 2, margin: `${spacing.lg}px 0 0` };

const subtle: React.CSSProperties = {
  color: colors.onSurfaceVariant,
  fontSize: 16,
  lineHeight: 2,
};

const warning: React.CSSProperties = {
  background: roles.warningBackground,
  color: roles.warningText,
  padding: spacing.sm,
  borderRadius: radius.md,
  margin: `${spacing.sm}px 0`,
  fontSize: 16,
  lineHeight: 2,
};
