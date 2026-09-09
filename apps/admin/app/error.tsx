'use client';

import { colors, radius, roles, spacing } from '@ghar/ui';

import { useLocale } from '../src/use-locale';
import { stringsFor } from '../src/strings';

/**
 * Error boundary for the admin panel.
 *
 * Every page in here is a server component that fetches from the API before it
 * renders. When the API is unreachable — not deployed yet, asleep on Render's
 * free tier, or API_BASE_URL pointing at localhost — the fetch throws and Next
 * serves a bare "500 Internal Server Error" with no explanation.
 *
 * This turns that into something an operator can act on. Next.js redacts server
 * error messages in production (they are replaced with a digest), so this shows
 * the likely causes rather than pretending to know which one it was.
 *
 * React requires error boundaries to be client components, so there is no
 * server parent to hand the locale down — it reads the cookie directly. That
 * is the reason the locale cookie is deliberately not httpOnly.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const S = stringsFor(useLocale()).error;

  return (
    <div style={wrap}>
      <h1 style={heading}>{S.title}</h1>

      <div style={warning}>{S.body}</div>

      <p style={subtle}>{S.hint}</p>

      <button type="button" onClick={reset} style={button}>
        {S.retry}
      </button>

      {/* English, and deliberately not translated: the only person who can act
          on this list is whoever deploys the service. */}
      <details style={details}>
        <summary style={summary}>Troubleshooting</summary>
        <ul style={list}>
          <li>
            Is the API up? Open <code style={code}>/health</code> on the API host — it
            should return <code style={code}>{'{"status":"ok","database":"up"}'}</code>.
          </li>
          <li>
            Is <code style={code}>API_BASE_URL</code> set on this Vercel project? It must
            include the <code style={code}>/api</code> suffix, e.g.{' '}
            <code style={code}>https://ghar-api.onrender.com/api</code>. Without it the
            build falls back to <code style={code}>http://localhost:3000/api</code>, which
            does not exist on Vercel.
          </li>
          <li>
            Changed an environment variable? Vercel only picks it up on a new
            deployment — redeploy after saving.
          </li>
          <li>
            Signed in? Admin routes need the <code style={code}>ghar_admin</code> cookie; a
            401 from the API surfaces here too.
          </li>
        </ul>
        {error.digest ? (
          <p style={digest}>
            Vercel log digest: <code style={code}>{error.digest}</code>
          </p>
        ) : null}
      </details>
    </div>
  );
}

const wrap: React.CSSProperties = {
  maxWidth: 720,
  display: 'flex',
  flexDirection: 'column',
  gap: spacing.sm,
};

const heading: React.CSSProperties = { fontSize: 24, lineHeight: 2, margin: 0 };

const warning: React.CSSProperties = {
  background: roles.warningBackground,
  color: roles.warningText,
  padding: spacing.sm,
  borderRadius: radius.md,
  fontSize: 16,
  lineHeight: 2,
};

const subtle: React.CSSProperties = {
  color: colors.onSurfaceVariant,
  fontSize: 16,
  lineHeight: 2,
  margin: 0,
};

const button: React.CSSProperties = {
  minHeight: spacing.touchTarget,
  alignSelf: 'flex-start',
  padding: `0 ${spacing.lg}px`,
  background: colors.primary,
  color: colors.onPrimary,
  border: 'none',
  borderRadius: radius.md,
  fontFamily: 'inherit',
  fontSize: 16,
  cursor: 'pointer',
};

const details: React.CSSProperties = {
  direction: 'ltr',
  textAlign: 'left',
  background: roles.cardBackground,
  border: `1px solid ${roles.cardBorder}`,
  borderRadius: radius.md,
  padding: spacing.sm,
  fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
  fontSize: 14,
  lineHeight: 1.6,
  marginTop: spacing.sm,
};

const summary: React.CSSProperties = { cursor: 'pointer', fontWeight: 700 };

const list: React.CSSProperties = {
  margin: `${spacing.xs}px 0 0`,
  paddingInlineStart: spacing.lg,
  display: 'grid',
  gap: spacing.base,
};

const code: React.CSSProperties = {
  background: colors.surfaceContainer,
  borderRadius: radius.sm,
  padding: '1px 4px',
  fontFamily: 'ui-monospace, SFMono-Regular, monospace',
};

const digest: React.CSSProperties = {
  marginTop: spacing.xs,
  marginBottom: 0,
  color: colors.onSurfaceVariant,
};
