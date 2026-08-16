'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';

import { decidePayment, type DecisionState } from './actions';

const REJECTION_REASONS = [
  'رقم کم بھیجی گئی',
  'ٹرانزیکشن نمبر نہیں ملا',
  'رسید صاف نہیں ہے',
  'یہ ادائیگی پہلے شمار ہو چکی ہے',
] as const;

/**
 * Approve is one click. Reject requires picking or typing a reason, and that
 * reason is sent to the agent by SMS in Urdu.
 *
 * The asymmetry is deliberate: approving a good payment should be frictionless
 * because it happens far more often, while rejecting is the action that can
 * cost you an agent, so it gets a beat of deliberation.
 */
export function DecisionForm({ paymentId }: { paymentId: string }) {
  const [state, action] = useActionState<DecisionState, FormData>(decidePayment, { status: 'idle' });
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');

  if (state.status === 'ok') {
    return <p style={{ color: '#006948', fontSize: 14, margin: 0 }}>{state.message}</p>;
  }

  return (
    <form action={action} style={{ display: 'grid', gap: 8 }}>
      <input type="hidden" name="paymentId" value={paymentId} />

      {rejecting ? (
        <>
          <select
            name="reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            style={input}
            dir="rtl"
          >
            <option value="">— وجہ منتخب کریں —</option>
            {REJECTION_REASONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          <SubmitButton name="decision" value="reject" tone="danger" disabled={reason.length < 4}>
            Confirm rejection
          </SubmitButton>

          <button type="button" onClick={() => setRejecting(false)} style={ghost}>
            Cancel
          </button>
        </>
      ) : (
        <>
          <SubmitButton name="decision" value="approve" tone="primary">
            Approve
          </SubmitButton>

          <button type="button" onClick={() => setRejecting(true)} style={ghost}>
            Reject…
          </button>
        </>
      )}

      {state.status === 'error' ? (
        <p style={{ color: '#93000a', fontSize: 13, margin: 0 }}>{state.message}</p>
      ) : null}
    </form>
  );
}

function SubmitButton({
  children,
  tone,
  disabled,
  ...rest
}: {
  children: React.ReactNode;
  tone: 'primary' | 'danger';
  disabled?: boolean;
  name: string;
  value: string;
}) {
  // Disabled while the action is in flight: a double-clicked approve would hit
  // the idempotency guard server-side, but the admin should never see a state
  // where it looks like nothing happened.
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending || disabled}
      style={{
        ...button,
        background: tone === 'primary' ? '#006948' : '#ba1a1a',
        opacity: pending || disabled ? 0.5 : 1,
      }}
      {...rest}
    >
      {pending ? 'Working…' : children}
    </button>
  );
}

const button: React.CSSProperties = {
  minHeight: 44,
  border: 0,
  borderRadius: 8,
  color: '#ffffff',
  fontSize: 15,
  cursor: 'pointer',
};

const ghost: React.CSSProperties = {
  minHeight: 40,
  background: 'transparent',
  border: '1px solid #bccac0',
  borderRadius: 8,
  fontSize: 14,
  cursor: 'pointer',
};

const input: React.CSSProperties = {
  minHeight: 44,
  borderRadius: 8,
  border: '1px solid #bccac0',
  padding: '0 8px',
  fontSize: 15,
};
