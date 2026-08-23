import type { Metadata } from 'next';

import { LoginForm } from './login-form';

export const metadata: Metadata = {
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
  const { expired } = await searchParams;
  return <LoginForm expired={expired === '1'} />;
}
