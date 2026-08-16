import type { ReactNode } from 'react';

import { colors } from '@ghar/ui';

import { C } from '../src/copy';
import { SiteFooter, SiteHeader } from '../src/components/chrome';

export const metadata = {
  title: `${C.brand} — ${C.tagline}`,
  description: C.home.heroSub,
};

/**
 * The marketing site.
 *
 * `lang="ur" dir="rtl"` server-side, not toggled on the client: these pages are
 * indexed, shared on WhatsApp and often opened with JS still loading, so the
 * language and direction have to be in the HTML that arrives.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ur" dir="rtl">
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
          fontFamily: "'Noto Nastaliq Urdu', system-ui, sans-serif",
          // ~2x leading, or Nastaliq descenders collide with the next line's
          // ascenders. Asserted for the app in packages/ui; the same script
          // needs the same room here.
          lineHeight: 2,
        }}
      >
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
