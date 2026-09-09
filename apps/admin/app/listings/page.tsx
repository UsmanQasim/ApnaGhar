import { isRtlLocale, PropertyPurpose, PropertyStatus, PropertyType } from '@ghar/shared';

import { adminApi } from '../../src/api';
import { getLocale } from '../../src/locale';
import { stringsFor } from '../../src/strings';
import {
  Badge,
  Card,
  EmptyState,
  PageHeader,
  TableScroll,
  fieldStyle,
  primaryButtonStyle,
  rupees,
} from '../../src/ui';
import { ListingActions } from './row-actions';

interface ListingRow {
  id: string;
  titleUr: string;
  purpose: PropertyPurpose;
  type: PropertyType;
  status: PropertyStatus;
  visibility: string;
  pricePaisa: string | null;
  priceVisibility: 'public' | 'on_request';
  city: string;
  locality: string | null;
  viewCount: number;
  media: Array<{ thumbnailUrl: string | null; kind: 'image' | 'video' }>;
  agent: { userId: string; agencyName: string | null; user: { name: string | null } };
}

export const dynamic = 'force-dynamic';

const STATUS_TONE: Record<PropertyStatus, 'neutral' | 'good' | 'warn' | 'bad'> = {
  draft: 'neutral',
  pending_payment: 'warn',
  active: 'good',
  sold: 'neutral',
  rented: 'neutral',
  expired: 'warn',
  archived: 'bad',
};

/**
 * Listing moderation.
 *
 * Filters are plain GET params so a filtered view is a URL — an operator
 * chasing a complaint can paste "every active shop in Karachi" into a ticket
 * rather than describing which dropdowns to click.
 */
export default async function AdminListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string; purpose?: string; type?: string; status?: string }>;
}) {
  // Per request, not module scope: the operator's language is a cookie.
  const locale = await getLocale();
  const S = stringsFor(locale);

  const params = await searchParams;
  const query = new URLSearchParams();
  for (const key of ['city', 'purpose', 'type', 'status'] as const) {
    const value = params[key];
    if (value) query.set(key, value);
  }

  const listings = await adminApi<ListingRow[]>(`/admin/listings?${query.toString()}`);

  return (
    <>
      <PageHeader title={S.listings.title} subtitle={S.listings.subtitle} />

      <form method="get" className="mb-md flex flex-wrap gap-xs">
        <input
          name="city"
          defaultValue={params.city ?? ''}
          placeholder={S.listings.allCities}
          aria-label={S.listings.allCities}
          className={`${fieldStyle} min-w-0 flex-1 basis-[180px]`}
        />
        <select
          name="purpose"
          defaultValue={params.purpose ?? ''}
          aria-label={S.listings.allPurposes}
          className={fieldStyle}
        >
          <option value="">{S.listings.allPurposes}</option>
          <option value={PropertyPurpose.SALE}>{S.listings.sale}</option>
          <option value={PropertyPurpose.RENT}>{S.listings.rent}</option>
        </select>
        <select
          name="type"
          defaultValue={params.type ?? ''}
          aria-label={S.listings.allTypes}
          className={fieldStyle}
        >
          <option value="">{S.listings.allTypes}</option>
          {Object.values(PropertyType).map((type) => (
            <option key={type} value={type}>
              {S.type[type]}
            </option>
          ))}
        </select>
        <select
          name="status"
          defaultValue={params.status ?? ''}
          aria-label={S.agents.status}
          className={fieldStyle}
        >
          <option value="">{S.agents.all}</option>
          {Object.values(PropertyStatus).map((status) => (
            <option key={status} value={status}>
              {S.status[status]}
            </option>
          ))}
        </select>
        <button type="submit" className={primaryButtonStyle}>
          {S.agents.filter}
        </button>
      </form>

      <Card>
        {listings.length === 0 ? (
          <EmptyState hint={S.listings.subtitle}>{S.listings.none}</EmptyState>
        ) : (
          <TableScroll>
            <table className="data-table">
              <thead>
                <tr>
                  <th>{S.listings.title}</th>
                  <th>{S.agents.detail}</th>
                  <th>{S.agents.status}</th>
                  <th className="num">{S.listings.views}</th>
                  <th>{S.agents.action}</th>
                </tr>
              </thead>
              <tbody>
                {listings.map((listing) => (
                  <tr key={listing.id}>
                    <td>
                      <div className="flex items-center gap-xs">
                        {/* A fixed 56×44 well, filled or empty. Without the
                            placeholder the first column jumps in height
                            between rows that have a photo and rows that do
                            not, and a scannable table stops scanning. */}
                        <div className="h-11 w-14 shrink-0 overflow-hidden rounded-md border border-card-border bg-surface-container-high">
                          {listing.media[0]?.thumbnailUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={listing.media[0].thumbnailUrl}
                              alt=""
                              className="size-full object-cover"
                            />
                          ) : null}
                        </div>

                        <div className="min-w-0">
                          <div className="truncate font-medium">{listing.titleUr}</div>
                          <div className="truncate text-xs text-on-surface-variant">
                            {[listing.locality, listing.city]
                              .filter(Boolean)
                              .join(isRtlLocale(locale) ? '، ' : ', ')}
                          </div>
                          <div className="numeric text-xs text-on-surface-variant">
                            {listing.priceVisibility === 'on_request' || listing.pricePaisa === null
                              ? S.priceOnRequest
                              : rupees(listing.pricePaisa)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="text-sm">{listing.agent.user.name ?? '—'}</div>
                      <div className="text-xs text-on-surface-variant">
                        {listing.agent.agencyName ?? S.agents.independent}
                      </div>
                    </td>
                    <td>
                      <Badge tone={STATUS_TONE[listing.status]}>{S.status[listing.status]}</Badge>
                    </td>
                    <td className="num">
                      {listing.viewCount.toLocaleString('en-PK')}
                    </td>
                    <td>
                      <ListingActions
                        propertyId={listing.id}
                        archived={listing.status === PropertyStatus.ARCHIVED}
                        strings={S}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
        )}
      </Card>
    </>
  );
}
