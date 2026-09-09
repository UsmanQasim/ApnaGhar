import type { ReactNode } from 'react';

import { colors } from '@ghar/ui';

import { C } from '../src/copy';
import { documentAttributes, getLocale } from '../src/locale';
import { SiteFooter, SiteHeader } from '../src/components/chrome';

export const metadata = {
  // Static: metadata is generated once per build, not per request, so it
  // cannot read the cookie. Urdu is the default locale, which is the right
  // thing for a search engine to index first.
  title: `${C.brand} — ${C.tagline}`,
  description: C.home.heroSub,
};

/**
 * The marketing site.
 *
 * `lang` and `dir` are decided SERVER-side and arrive in the HTML: these pages
 * are indexed, shared on WhatsApp and often opened with JS still loading, so a
 * client-side toggle would be too late. They now come from the request rather
 * than being hardcoded — Roman Urdu is the case that forces it, being Urdu
 * written left to right.
 */
export default async function RootLayout({ children }: { children: ReactNode }) {
  const doc = documentAttributes(await getLocale());

  return (
    <html lang={doc.lang} dir={doc.dir}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* `display=swap`: Nastaliq is a heavy face and this page is usually
            opened on mobile data. Text in a fallback beats a blank screen. */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;600;700&family=Plus+Jakarta+Sans:wght@500;700&display=swap"
        />
      </head>
      <body
        style={{
          margin: 0,
          background: colors.surface,
          color: colors.onSurface,
          // The face follows the SCRIPT: Nastaliq has no usable Latin glyphs,
          // so Roman Urdu left in it renders one line in several fallbacks.
          fontFamily: doc.fontFamily,
          // ~2x leading, or Nastaliq descenders collide with the next line's
          // ascenders. Asserted for the app in packages/ui; the same script
          // needs the same room here — and Latin needs much less.
          lineHeight: doc.lineHeight,
        }}
      >
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
