'use client';

import { useFormState, useFormStatus } from 'react-dom';

import type { WebCopy } from '../../src/copy';
import { submitContact, type ContactState } from './actions';

const INITIAL: ContactState = { status: 'idle', message: null };

export function ContactForm({ strings }: { strings: WebCopy['contact'] }) {
  const [state, action] = useFormState(submitContact, INITIAL);

  return (
    <form action={action} className="grid gap-sm">
      <Field name="name" label={strings.name} required />
      <Field name="email" label={strings.email} type="email" />
      <Field name="phone" label={strings.phone} type="tel" ltr />

      <label className="grid gap-1">
        <span className="text-[15px] font-medium">{strings.message}</span>
        <textarea
          name="message"
          required
          rows={5}
          // `leading-normal` rather than inheriting: the body's ~2x Nastaliq
          // leading turns a textarea into a double-spaced form field, and a
          // hardcoded 2 does the same to the Latin one.
          className={fieldClass + ' resize-y py-sm leading-normal'}
        />
      </label>

      {state.message ? (
        <p
          role="status"
          className={[
            'm-0 rounded-md px-sm py-2 text-[15px]',
            state.status === 'sent'
              ? 'bg-primary-fixed text-on-primary-fixed'
              : 'bg-error-container text-on-error-container',
          ].join(' ')}
        >
          {state.message}
        </p>
      ) : null}

      <SubmitButton label={strings.sendMessage} />
    </form>
  );
}

/**
 * One class for every control on the form.
 *
 * The old inline styles gave inputs a border and nothing else — no hover, no
 * focus ring, no transition — because an inline style cannot express any of
 * them. That is most of why the form read as unstyled next to the cards
 * around it.
 */
const fieldClass =
  'w-full rounded-md border border-card-border bg-card-background px-sm text-[16px] ' +
  'text-on-surface transition-colors duration-150 ' +
  'hover:border-outline-variant focus:border-primary focus:outline-none';

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={
        'touch mt-1 cursor-pointer rounded-md border-0 bg-primary text-[16px] font-semibold ' +
        'text-on-primary transition-colors duration-150 hover:bg-primary-container ' +
        'disabled:cursor-progress disabled:opacity-60'
      }
    >
      {label}
    </button>
  );
}

function Field({
  name,
  label,
  type = 'text',
  required,
  ltr,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  ltr?: boolean;
}) {
  // A phone number or an email must not mirror inside the RTL form. `.numeric`
  // carries the Latin face, LTR direction and bidi isolation together, so the
  // three cannot be applied inconsistently.
  const latin = ltr || type === 'email';

  return (
    <label className="grid gap-1">
      <span className="text-[15px] font-medium">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        className={`${fieldClass} touch ${latin ? 'numeric text-start' : ''}`}
      />
    </label>
  );
}
