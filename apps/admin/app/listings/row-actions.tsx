'use client';

import { useTransition } from 'react';

import { spacing } from '@ghar/ui';

import { S } from '../../src/strings';
import { buttonStyle, dangerButtonStyle } from '../../src/ui';
import { setListingStatus } from './actions';

export function ListingActions({ propertyId, archived }: { propertyId: string; archived: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <div style={{ display: 'flex', gap: spacing.xs, flexWrap: 'wrap' }}>
      <a href={`/listings/${propertyId}`} style={{ ...buttonStyle, display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>
        {S.listings.review}
      </a>
      <button
        type="button"
        disabled={pending}
        style={archived ? buttonStyle : dangerButtonStyle}
        onClick={() => startTransition(() => void setListingStatus(propertyId, !archived))}
      >
        {archived ? S.listings.reactivate : S.listings.deactivate}
      </button>
    </div>
  );
}
