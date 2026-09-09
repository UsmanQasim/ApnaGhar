import type { Metadata } from 'next';

import { getLocale } from '../../src/locale';
import { stringsFor } from '../../src/strings';
import { LoginForm } from './login-form';

export const metadata: Metadata = {
  // Static, so the default locale. Never indexed either way.
  title: 'گھر ایڈمن — لاگ اِن',
  robots: { index: false, follow: false },
};

// The session cookie is read on every render; nothing here may be cached.
export const dynamic = 'force-dynamic';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ expired?: string }>;
}) {
  const [{ expired }, locale] = await Promise.all([searchParams, getLocale()]);
  return <LoginForm expired={expired === '1'} strings={stringsFor(locale).login} />;
}
