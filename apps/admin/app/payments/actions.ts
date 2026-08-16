'use server';

import { revalidatePath } from 'next/cache';

import { adminApi } from '../../src/api';

export interface DecisionState {
  status: 'idle' | 'ok' | 'error';
  message?: string;
}

/**
 * Approve or reject a manual wallet payment.
 *
 * Rejection REQUIRES a reason. The agent gets it by SMS in Urdu, and "your
 * payment was rejected" with no explanation is how you lose an agent who
 * actually paid and mistyped a digit.
 */
export async function decidePayment(
  _previous: DecisionState,
  formData: FormData,
): Promise<DecisionState> {
  const paymentId = String(formData.get('paymentId') ?? '');
  const decision = String(formData.get('decision') ?? '');
  const reason = String(formData.get('reason') ?? '').trim();

  if (!paymentId || (decision !== 'approve' && decision !== 'reject')) {
    return { status: 'error', message: 'Invalid submission.' };
  }

  if (decision === 'reject' && reason.length < 4) {
    return {
      status: 'error',
      message: 'A reason is required — the agent receives it by SMS.',
    };
  }

  try {
    await adminApi('/payments/decide', {
      method: 'POST',
      body: { paymentId, decision, reason: reason || undefined },
    });
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Request failed.',
    };
  }

  revalidatePath('/payments');
  return {
    status: 'ok',
    message: decision === 'approve' ? 'Approved — agent reinstated.' : 'Rejected — agent notified.',
  };
}
