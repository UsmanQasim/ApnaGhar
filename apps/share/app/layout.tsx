import type { ReactNode } from 'react';

import { getLocale, documentAttributes } from '../src/locale';

/**
 * The document shell.
 *
 * `lang` and `dir` come from the request rather than being hardcoded to
 * `ur`/`rtl`. Roman Urdu is the case that makes this necessary: it is Urdu, so
 * a naive "is the user an Urdu speaker?" test would flip a Latin-script page
 * into RTL and mirror the entire layout.
 */
export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  const doc = documentAttributes(locale);

  return (
    <html lang={doc.lang} dir={doc.dir}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* Preconnect then load: Nastaliq is a heavy face and this page is
            often opened on mobile data. `display=swap` shows text immediately
            in a fallback rather than leaving a blank screen. */}
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;600;700&family=Plus+Jakarta+Sans:wght@400;500;700&display=swap"
        />
      </head>
      <body
        style={{
          margin: 0,
          // The face follows the script, not the language. Nastaliq has no
          // usable Latin glyphs, so Roman Urdu left in it renders one line in
          // several fallback faces.
          fontFamily: doc.fontFamily,
          // ~2x leading is a legibility requirement of Nastaliq's descenders.
          // On Latin the same value reads as double-spaced text.
          lineHeight: doc.lineHeight,
        }}
      >
        {children}
      </body>
    </html>
  );
}
