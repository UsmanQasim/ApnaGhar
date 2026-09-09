import { colors, radius, roles, spacing } from '@ghar/ui';

import { LanguageSwitcher } from '../src/LanguageSwitcher';
import { copyFor } from '../src/copy';
import { getLocale } from '../src/locale';

/**
 * 404 for the share host — e.g. a truncated link, or a path that is not /s/….
 *
 * Deliberately says nothing about whether a token exists. "Not found" and
 * "revoked" must look identical from outside, or the 404 becomes an oracle for
 * guessing valid tokens.
 */
export default async function NotFound() {
  const locale = await getLocale();
  const C = copyFor(locale);

  return (
    <main style={page}>
      <h1 style={heading}>{C.notFound.title}</h1>

      <div style={warning}>{C.notFound.warning}</div>

      <p style={subtle}>{C.notFound.hint}</p>

      {/* Offered even here: someone who cannot read the error is exactly the
          person who needs the switcher most. */}
      <div style={{ marginTop: spacing.lg }}>
        <LanguageSwitcher active={locale} label={C.language} />
      </div>
    </main>
  );
}

const page: React.CSSProperties = {
  maxWidth: 560,
  margin: '0 auto',
  padding: spacing.md,
  background: colors.surface,
  color: colors.onSurface,
  minHeight: '100vh',
};

const heading: React.CSSProperties = { fontSize: 24, margin: `${spacing.lg}px 0 0` };

const subtle: React.CSSProperties = {
  color: colors.onSurfaceVariant,
  fontSize: 16,
};

const warning: React.CSSProperties = {
  background: roles.warningBackground,
  color: roles.warningText,
  padding: spacing.sm,
  borderRadius: radius.md,
  margin: `${spacing.sm}px 0`,
  fontSize: 16,
};
