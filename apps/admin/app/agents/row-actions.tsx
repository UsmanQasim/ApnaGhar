'use client';

import { useState, useTransition } from 'react';

import type { AdminStrings } from '../../src/strings';
import { buttonStyle, dangerButtonStyle, primaryButtonStyle } from '../../src/ui';
import { setAgentStatus, setAgentVerified } from './actions';

/**
 * Verify / suspend controls for one agent.
 *
 * Suspension asks for confirmation; verification does not. Verifying is
 * reversible and low-stakes; suspending cuts off an agent's income and hides
 * every listing he owns, and it is one row away from the button above it.
 */
export function RowActions({
  agentId,
  verified,
  suspended,
  strings: S,
}: {
  agentId: string;
  verified: boolean;
  suspended: boolean;
  /** Client component: no server parent to ask, so the labels travel with it. */
  strings: AdminStrings;
}) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="flex flex-wrap gap-xs">
      <button
        type="button"
        disabled={pending}
        className={verified ? buttonStyle : primaryButtonStyle}
        onClick={() => startTransition(() => void setAgentVerified(agentId, !verified))}
      >
        {verified ? S.agents.unverify : S.agents.verify}
      </button>

      {confirming ? (
        <>
          <button
            type="button"
            disabled={pending}
            className={dangerButtonStyle}
            onClick={() =>
              startTransition(() => {
                void setAgentStatus(agentId, !suspended);
                setConfirming(false);
              })
            }
          >
            {S.agents.suspend}
          </button>
          <button
            type="button"
            className={buttonStyle}
            aria-label={S.payments.cancel}
            onClick={() => setConfirming(false)}
          >
            <span aria-hidden>✕</span>
          </button>
        </>
      ) : (
        <button
          type="button"
          disabled={pending}
          className={buttonStyle}
          onClick={() =>
            suspended
              ? startTransition(() => void setAgentStatus(agentId, false))
              : setConfirming(true)
          }
        >
          {suspended ? S.agents.reinstate : S.agents.suspend}
        </button>
      )}
    </div>
  );
}
