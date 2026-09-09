'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';

import type { AdminStrings } from '../../src/strings';
import { dangerButtonStyle, fieldStyle, ghostButtonStyle, primaryButtonStyle } from '../../src/ui';
import { decidePayment, type DecisionState } from './actions';

type PaymentStrings = AdminStrings['payments'];

/**
 * Approve is one click. Reject requires picking or typing a reason, and that
 * reason is sent to the agent by SMS in Urdu.
 *
 * The asymmetry is deliberate: approving a good payment should be frictionless
 * because it happens far more often, while rejecting is the action that can
 * cost you an agent, so it gets a beat of deliberation.
 */
export function DecisionForm({
  paymentId,
  strings,
}: {
  paymentId: string;
  /**
   * Passed down rather than looked up. This is a client component with no
   * server parent to ask for the locale, and the rejection reasons are sent
   * verbatim to the agent by SMS — they must be in the operator's language,
   * not whichever one happened to be bundled.
   */
  strings: PaymentStrings;
}) {
  const [state, action] = useActionState<DecisionState, FormData>(decidePayment, { status: 'idle' });
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');

  if (state.status === 'ok') {
    return (
      <p className="m-0 rounded-md bg-primary-fixed px-sm py-2 text-sm text-on-primary-fixed">
        {state.message}
      </p>
    );
  }

  return (
    <form action={action} className="grid gap-xs">
      <input type="hidden" name="paymentId" value={paymentId} />

      {rejecting ? (
        <>
          <select
            name="reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className={fieldStyle}
          >
            <option value="">{strings.chooseReason}</option>
            {strings.rejectReasons.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          <SubmitButton
            name="decision"
            value="reject"
            tone="danger"
            disabled={reason.length < 4}
            working={strings.working}
          >
            {strings.confirmRejection}
          </SubmitButton>

          <button type="button" onClick={() => setRejecting(false)} className={ghostButtonStyle}>
            {strings.cancel}
          </button>
        </>
      ) : (
        <>
          <SubmitButton name="decision" value="approve" tone="primary" working={strings.working}>
            {strings.approve}
          </SubmitButton>

          <button type="button" onClick={() => setRejecting(true)} className={ghostButtonStyle}>
            {strings.rejectEllipsis}
          </button>
        </>
      )}

      {state.status === 'error' ? (
        <p className="m-0 text-xs text-on-error-container">{state.message}</p>
      ) : null}
    </form>
  );
}

function SubmitButton({
  children,
  tone,
  disabled,
  working,
  ...rest
}: {
  children: React.ReactNode;
  tone: 'primary' | 'danger';
  disabled?: boolean;
  working: string;
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
      className={tone === 'primary' ? primaryButtonStyle : dangerButtonStyle}
      {...rest}
    >
      {pending ? working : children}
    </button>
  );
}
