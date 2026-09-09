import type { Metadata } from 'next';

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
  robots: { index: false, follow: false },
};

const WEB_URL = process.env['WEB_BASE_URL'] ?? 'https://apna-ghar-web.vercel.app';

export default async function ShareIndexPage() {
  const locale = await getLocale();
  const C = copyFor(locale);

  return (
    <main className="mx-auto grid max-w-[560px] gap-md px-md py-xl">
      <div className="flex items-center gap-sm">
        <span className="grid size-11 shrink-0 place-items-center rounded-md bg-primary text-on-primary">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M3 10.5 12 4l9 6.5" />
            <path d="M5.5 12v8h13v-8" />
            <path d="M10 20v-4.5h4V20" />
          </svg>
        </span>
        <h1 className="m-0 text-[22px] font-bold tracking-tight text-on-surface">{C.brand}</h1>
      </div>

      <p className="m-0 text-[16px] text-on-surface">{C.index.intro}</p>

      <div className="card grid gap-1 p-sm">
        <span className="text-xs text-on-surface-variant">{C.index.linkShapeLabel}</span>
        {/* Latin path, so force LTR inside an RTL page or the slashes jump. */}
        <code className="numeric text-[16px] font-bold text-on-surface">/s/xxxxxxxxxxxx</code>
      </div>

      <p className="m-0 text-[15px] text-on-surface-variant">{C.index.troubleshoot}</p>

      <a
        href={WEB_URL}
        className="touch inline-flex items-center justify-center rounded-md bg-primary text-[16px] font-semibold text-on-primary no-underline transition-colors hover:bg-primary-container"
      >
        {C.index.visitWebsite}
      </a>

      <hr className="hairline my-xs" />

      <LanguageSwitcher active={locale} label={C.language} />
    </main>
  );
}
