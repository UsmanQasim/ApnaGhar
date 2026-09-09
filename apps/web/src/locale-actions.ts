'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

import { parseLocale } from '@ghar/shared';

import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE } from './locale-cookie';

/**
 * Set the language from a plain <form>. No client JavaScript involved — the
 * switcher is a server action, so it works on the cheap Android handsets this
 * page is mostly opened on, and before hydration on the rest.
 */
export async function setLocale(formData: FormData): Promise<void> {
  const locale = parseLocale(String(formData.get('locale') ?? ''));

  (await cookies()).set(LOCALE_COOKIE, locale, {
    maxAge: LOCALE_COOKIE_MAX_AGE,
    sameSite: 'lax',
    path: '/',
    // Readable by script is fine and useful; this is a display preference,
    // not a credential.
    httpOnly: false,
  });

  revalidatePath('/', 'layout');
}
