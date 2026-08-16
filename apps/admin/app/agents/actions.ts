'use server';

import { revalidatePath } from 'next/cache';

import { UserStatus } from '@ghar/shared';

import { adminApi } from '../../src/api';

/**
 * Server actions, not client fetches.
 *
 * The admin token lives in an httpOnly cookie and is never handed to client
 * JS — this panel can suspend accounts and approve money, so an XSS on it
 * would be a very expensive bug. Every mutation goes through the server.
 */
export async function setAgentVerified(agentId: string, verified: boolean): Promise<void> {
  await adminApi(`/admin/agents/${agentId}/verified`, {
    method: 'POST',
    body: { verified },
  });
  revalidatePath('/agents');
}

export async function setAgentStatus(agentId: string, suspend: boolean): Promise<void> {
  await adminApi(`/admin/agents/${agentId}/status`, {
    method: 'POST',
    body: { status: suspend ? UserStatus.SUSPENDED : UserStatus.ACTIVE },
  });
  revalidatePath('/agents');
}
