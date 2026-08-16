'use server';

import { C } from '../../src/copy';

export interface ContactState {
  status: 'idle' | 'sent' | 'error';
  message: string | null;
}

/**
 * Contact form submission.
 *
 * A server action rather than a client fetch, so the form works with
 * JavaScript disabled or still loading — this page is opened on slow
 * connections from a WhatsApp link, and a contact form that needs a hydrated
 * bundle before it will submit is a contact form that loses messages.
 *
 * ⚠️ There is no delivery yet. `CONTACT_WEBHOOK_URL` is the single integration
 * point: set it to a Slack/email webhook and messages start arriving. Until
 * then this validates and reports failure honestly rather than showing a
 * success message for a message nobody received — a silent black hole on a
 * contact form is worse than no form at all.
 */
export async function submitContact(
  _previous: ContactState,
  formData: FormData,
): Promise<ContactState> {
  const name = String(formData.get('name') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();
  const phone = String(formData.get('phone') ?? '').trim();
  const message = String(formData.get('message') ?? '').trim();

  if (name.length === 0 || message.length === 0) {
    return { status: 'error', message: C.contact.required };
  }

  const webhook = process.env['CONTACT_WEBHOOK_URL'];
  if (!webhook) {
    return { status: 'error', message: C.contact.failed };
  }

  try {
    const response = await fetch(webhook, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name, email, phone, message, at: new Date().toISOString() }),
    });
    if (!response.ok) return { status: 'error', message: C.contact.failed };
  } catch {
    return { status: 'error', message: C.contact.failed };
  }

  return { status: 'sent', message: C.contact.sent };
}
