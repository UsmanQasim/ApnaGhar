'use client';

import { useTransition } from 'react';

import type { AdminStrings } from '../../src/strings';
import { buttonStyle, dangerButtonStyle } from '../../src/ui';
import { setListingStatus } from './actions';

export function ListingActions({
  propertyId,
  archived,
  strings: S,
}: {
  propertyId: string;
  archived: boolean;
  /** Client component: no server parent to ask, so the labels travel with it. */
  strings: AdminStrings;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap gap-xs">
      <a href={`/listings/${propertyId}`} className={`${buttonStyle} no-underline`}>
        {S.listings.review}
      </a>
      <button
        type="button"
        disabled={pending}
        className={archived ? buttonStyle : dangerButtonStyle}
        onClick={() => startTransition(() => void setListingStatus(propertyId, !archived))}
      >
        {archived ? S.listings.reactivate : S.listings.deactivate}
      </button>
    </div>
  );
}
