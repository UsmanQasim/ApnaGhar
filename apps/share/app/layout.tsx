import type { ReactNode } from 'react';

import './globals.css';

import { documentAttributes, getLocale } from '../src/locale';

/**
 * The document shell.
 *
 * `lang` and `dir` come from the request rather than being hardcoded to
 * `ur`/`rtl`. Roman Urdu is the case that makes this necessary: it is Urdu, so
 * a naive "is the user an Urdu speaker?" test would flip a Latin-script page
 * into RTL and mirror the entire layout.
 *
 * `data-script` is what the shared base layer keys the face and leading off —
 * see @ghar/ui/web-base.css.
 */
export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  const doc = documentAttributes(locale);

  return (
    <html lang={doc.lang} dir={doc.dir} data-script={doc.script}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* Preconnect then load: Nastaliq is a heavy face and this page is
            often opened on mobile data. `display=swap` shows text immediately
            in a fallback rather than leaving a blank screen. */}
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
        />
      </head>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
