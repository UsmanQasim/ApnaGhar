import type { ReactNode } from 'react';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ur" dir="rtl">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* Preconnect then load: Nastaliq is a heavy face and this page is
            often opened on mobile data. `display=swap` shows text immediately
            in a fallback rather than leaving a blank screen. */}
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;600;700&family=Plus+Jakarta+Sans:wght@500;700&display=swap"
        />
      </head>
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
