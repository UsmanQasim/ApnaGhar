'use server';

import { revalidatePath } from 'next/cache';

import { PropertyStatus } from '@ghar/shared';

import { adminApi } from '../../src/api';

/**
 * Take a listing down, or put it back.
 *
 * `archived`, never a hard delete: the listing is the evidence if the agent
 * disputes the decision, and the Rs 50 listing fee already charged against it
 * has to stay traceable in the ledger.
 */
export async function setListingStatus(propertyId: string, deactivate: boolean): Promise<void> {
  await adminApi(`/admin/listings/${propertyId}/status`, {
    method: 'POST',
    body: { status: deactivate ? PropertyStatus.ARCHIVED : PropertyStatus.ACTIVE },
  });
  revalidatePath('/listings');
}
