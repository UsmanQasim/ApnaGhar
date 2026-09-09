'use client';

import { useLocale } from '../src/use-locale';
import { stringsFor } from '../src/strings';
import { primaryButtonStyle } from '../src/ui';

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
    <div className="grid max-w-[720px] gap-sm">
      <h1 className="m-0 text-2xl font-semibold tracking-tight">{S.title}</h1>

      <div className="rounded-md bg-error-container p-sm text-on-error-container">{S.body}</div>

      <p className="m-0 text-on-surface-variant">{S.hint}</p>

      <button type="button" onClick={reset} className={`${primaryButtonStyle} justify-self-start`}>
        {S.retry}
      </button>

      {/* English, and deliberately not translated: the only person who can act
          on this list is whoever deploys the service. */}
      <details className="mt-sm rounded-md border border-card-border bg-card-background p-sm text-left text-sm ltr">
        <summary className="cursor-pointer font-semibold">Troubleshooting</summary>
        <ul className="mt-xs grid gap-2 ps-4 leading-normal">
          <li>
            Is the API up? Open <code className="numeric rounded bg-surface-container px-1">/health</code> on the API host — it
            should return <code className="numeric rounded bg-surface-container px-1">{'{"status":"ok","database":"up"}'}</code>.
          </li>
          <li>
            Is <code className="numeric rounded bg-surface-container px-1">API_BASE_URL</code> set on this Vercel project? It must
            include the <code className="numeric rounded bg-surface-container px-1">/api</code> suffix, e.g.{' '}
            <code className="numeric rounded bg-surface-container px-1">https://ghar-api.onrender.com/api</code>. Without it the
            build falls back to <code className="numeric rounded bg-surface-container px-1">http://localhost:3000/api</code>, which
            does not exist on Vercel.
          </li>
          <li>
            Changed an environment variable? Vercel only picks it up on a new
            deployment — redeploy after saving.
          </li>
          <li>
            Signed in? Admin routes need the <code className="numeric rounded bg-surface-container px-1">ghar_admin</code> cookie; a
            401 from the API surfaces here too.
          </li>
        </ul>
        {error.digest ? (
          <p className="mt-sm text-xs text-on-surface-variant">
            Vercel log digest: <code className="numeric rounded bg-surface-container px-1">{error.digest}</code>
          </p>
        ) : null}
      </details>
    </div>
  );
}
