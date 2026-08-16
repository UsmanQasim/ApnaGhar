'use client';

import { useFormState, useFormStatus } from 'react-dom';

import { colors, radius, roles, spacing } from '@ghar/ui';

import { C } from '../../src/copy';
import { submitContact, type ContactState } from './actions';

const INITIAL: ContactState = { status: 'idle', message: null };

export function ContactForm() {
  const [state, action] = useFormState(submitContact, INITIAL);

  return (
    <form action={action} style={{ display: 'grid', gap: spacing.sm }}>
      <Field name="name" label={C.contact.name} required />
      <Field name="email" label={C.contact.email} type="email" />
      <Field name="phone" label={C.contact.phone} type="tel" ltr />

      <label style={{ display: 'grid', gap: spacing.base }}>
        <span style={{ fontSize: 16 }}>{C.contact.message}</span>
        <textarea
          name="message"
          required
          rows={5}
          style={{
            padding: spacing.sm,
            borderRadius: radius.md,
            border: `1px solid ${roles.cardBorder}`,
            fontFamily: 'inherit',
            fontSize: 16,
            lineHeight: 2,
            resize: 'vertical',
          }}
        />
      </label>

      {state.message ? (
        <p
          role="status"
          style={{
            margin: 0,
            padding: spacing.sm,
            borderRadius: radius.md,
            background: state.status === 'sent' ? colors.primaryFixed : colors.errorContainer,
            color: state.status === 'sent' ? colors.onPrimaryFixed : colors.onErrorContainer,
            fontSize: 16,
          }}
        >
          {state.message}
        </p>
      ) : null}

      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      style={{
        minHeight: spacing.touchTarget,
        borderRadius: radius.md,
        border: 'none',
        background: colors.primary,
        color: colors.onPrimary,
        fontFamily: 'inherit',
        fontSize: 17,
        cursor: pending ? 'progress' : 'pointer',
        opacity: pending ? 0.6 : 1,
      }}
    >
      {C.contact.sendMessage}
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
  return (
    <label style={{ display: 'grid', gap: spacing.base }}>
      <span style={{ fontSize: 16 }}>{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        style={{
          minHeight: spacing.touchTarget,
          padding: `0 ${spacing.sm}px`,
          borderRadius: radius.md,
          border: `1px solid ${roles.cardBorder}`,
          fontFamily: ltr ? "'Plus Jakarta Sans', sans-serif" : 'inherit',
          fontSize: 16,
          // A phone number or an email must not mirror inside the RTL form.
          direction: ltr || type === 'email' ? 'ltr' : 'rtl',
          textAlign: ltr || type === 'email' ? 'left' : 'right',
        }}
      />
    </label>
  );
}
