import { PropertyPurpose, PropertyStatus, PropertyType } from '@ghar/shared';
import { colors, radius, roles, spacing } from '@ghar/ui';

import { adminApi } from '../../src/api';
import { S } from '../../src/strings';
import { Badge, Card, PageHeader, muted, rupees, tableStyle, tdStyle, thStyle } from '../../src/ui';
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

      <form
        method="get"
        style={{ display: 'flex', gap: spacing.xs, flexWrap: 'wrap', marginBottom: spacing.md }}
      >
        <input
          name="city"
          defaultValue={params.city ?? ''}
          placeholder={S.listings.allCities}
          aria-label={S.listings.allCities}
          style={fieldStyle}
        />
        <select name="purpose" defaultValue={params.purpose ?? ''} aria-label={S.listings.allPurposes} style={fieldStyle}>
          <option value="">{S.listings.allPurposes}</option>
          <option value={PropertyPurpose.SALE}>{S.listings.sale}</option>
          <option value={PropertyPurpose.RENT}>{S.listings.rent}</option>
        </select>
        <select name="type" defaultValue={params.type ?? ''} aria-label={S.listings.allTypes} style={fieldStyle}>
          <option value="">{S.listings.allTypes}</option>
          {Object.values(PropertyType).map((type) => (
            <option key={type} value={type}>
              {S.type[type]}
            </option>
          ))}
        </select>
        <select name="status" defaultValue={params.status ?? ''} aria-label={S.agents.status} style={fieldStyle}>
          <option value="">{S.agents.all}</option>
          {Object.values(PropertyStatus).map((status) => (
            <option key={status} value={status}>
              {S.status[status]}
            </option>
          ))}
        </select>
        <button type="submit" style={submitStyle}>
          {S.listings.title}
        </button>
      </form>

      <Card style={{ overflowX: 'auto' }}>
        {listings.length === 0 ? (
          <p style={muted}>{S.listings.none}</p>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>{S.listings.title}</th>
                <th style={thStyle}>{S.agents.detail}</th>
                <th style={thStyle}>{S.agents.status}</th>
                <th style={thStyle}>{S.listings.views}</th>
                <th style={thStyle}>{S.agents.action}</th>
              </tr>
            </thead>
            <tbody>
              {listings.map((listing) => (
                <tr key={listing.id}>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: spacing.xs, alignItems: 'center' }}>
                      <div
                        style={{
                          width: 56,
                          height: 44,
                          borderRadius: radius.md,
                          background: colors.surfaceContainerHigh,
                          border: `1px solid ${roles.cardBorder}`,
                          overflow: 'hidden',
                          flexShrink: 0,
                        }}
                      >
                        {listing.media[0]?.thumbnailUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={listing.media[0].thumbnailUrl}
                            alt=""
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : null}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 15 }}>{listing.titleUr}</div>
                        <div style={muted}>
                          {[listing.locality, listing.city].filter(Boolean).join('، ')}
                        </div>
                        <div style={{ ...muted, direction: 'ltr', textAlign: 'start' }}>
                          {listing.priceVisibility === 'on_request' || listing.pricePaisa === null
                            ? S.priceOnRequest
                            : rupees(listing.pricePaisa)}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ fontSize: 14 }}>{listing.agent.user.name ?? '—'}</div>
                    <div style={muted}>{listing.agent.agencyName ?? S.agents.independent}</div>
                  </td>
                  <td style={tdStyle}>
                    <Badge tone={STATUS_TONE[listing.status]}>{S.status[listing.status]}</Badge>
                  </td>
                  <td style={{ ...tdStyle, direction: 'ltr', textAlign: 'end' }}>
                    {listing.viewCount.toLocaleString('en-PK')}
                  </td>
                  <td style={tdStyle}>
                    <ListingActions
                      propertyId={listing.id}
                      archived={listing.status === PropertyStatus.ARCHIVED}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}

const fieldStyle = {
  minHeight: spacing.touchTarget,
  padding: `0 ${spacing.sm}px`,
  borderRadius: radius.md,
  border: `1px solid ${colors.outlineVariant}`,
  fontFamily: 'inherit',
  fontSize: 14,
};

const submitStyle = {
  ...fieldStyle,
  border: 'none',
  background: colors.primary,
  color: colors.onPrimary,
  cursor: 'pointer',
};
