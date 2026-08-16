import Link from 'next/link';

import { colors, radius, roles, spacing } from '@ghar/ui';

import { adminApi } from '../src/api';
import { S } from '../src/strings';
import { Badge, Card, PageHeader, StatTile, rupees, muted, tableStyle, tdStyle, thStyle } from '../src/ui';

interface Overview {
  tiles: {
    revenuePaisa: number;
    revenueDelta: number | null;
    pendingPaisa: number;
    pendingDelta: number | null;
    activeAgents: number;
    activeAgentsDelta: number;
    newListings: number;
    newListingsDelta: number;
  };
  pendingPayments: Array<{
    id: string;
    amountPaisa: string;
    createdAt: string;
    agentName: string | null;
  }>;
  activity: Array<{
    kind: 'listing' | 'agent' | 'payment';
    at: string;
    label: string;
    detail: string | null;
  }>;
}

export const dynamic = 'force-dynamic';

const ACTIVITY_LABEL: Record<Overview['activity'][number]['kind'], string> = {
  listing: S.overview.newListingLogged,
  agent: S.overview.newAgentLogged,
  payment: S.overview.paymentApproved,
};

const ACTIVITY_ICON: Record<Overview['activity'][number]['kind'], string> = {
  listing: '🏠',
  agent: '👤',
  payment: '✅',
};

/**
 * Admin overview.
 *
 * The pending-payments table is placed above recent activity deliberately:
 * activity is interesting, a pending manual transfer is money an agent has
 * already sent and is waiting on. One of these is a to-do list; the other is
 * a feed.
 */
export default async function AdminOverviewPage() {
  const data = await adminApi<Overview>('/admin/overview');

  return (
    <>
      <PageHeader title={S.overview.title} subtitle={S.overview.subtitle} />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: spacing.md,
          marginBottom: spacing.lg,
        }}
      >
        <StatTile
          label={S.overview.totalRevenue}
          value={rupees(data.tiles.revenuePaisa)}
          delta={data.tiles.revenueDelta}
        />
        <StatTile
          label={S.overview.pendingPayments}
          value={rupees(data.tiles.pendingPaisa)}
          delta={data.tiles.pendingDelta}
        />
        <StatTile
          label={S.overview.activeAgents}
          value={data.tiles.activeAgents.toLocaleString('en-PK')}
          delta={data.tiles.activeAgentsDelta}
          suffix=""
        />
        <StatTile
          label={S.overview.newListings}
          value={data.tiles.newListings.toLocaleString('en-PK')}
          delta={data.tiles.newListingsDelta}
          suffix=""
        />
      </div>

      {/* ── Pending payments ──────────────────────────────────────────── */}
      <Card style={{ marginBottom: spacing.lg }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.sm }}>
          <span aria-hidden>⚠️</span>
          <h2 style={{ margin: 0, fontSize: 18, flex: 1 }}>{S.overview.pendingPayments}</h2>
          <Link href="/payments" style={{ color: colors.primary, fontSize: 14 }}>
            {S.overview.seeAll}
          </Link>
        </div>

        {data.pendingPayments.length === 0 ? (
          <p style={muted}>{S.overview.nothingPending}</p>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>{S.overview.agentName}</th>
                <th style={thStyle}>{S.overview.amount}</th>
                <th style={thStyle}>{S.overview.date}</th>
                <th style={thStyle}>{S.overview.action}</th>
              </tr>
            </thead>
            <tbody>
              {data.pendingPayments.map((payment) => (
                <tr key={payment.id}>
                  <td style={tdStyle}>{payment.agentName ?? '—'}</td>
                  <td style={{ ...tdStyle, direction: 'ltr', textAlign: 'end' }}>
                    {rupees(payment.amountPaisa)}
                  </td>
                  <td style={{ ...tdStyle, direction: 'ltr', textAlign: 'end' }}>
                    {new Date(payment.createdAt).toLocaleDateString('en-PK', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td style={tdStyle}>
                    {/* The decision itself lives on /payments, where the
                        receipt image is visible. Approving from a summary row
                        without seeing the evidence is how wrong approvals
                        happen. */}
                    <Link href="/payments" style={{ color: colors.primary }}>
                      {S.overview.seeAll}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* ── Activity ──────────────────────────────────────────────────── */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.sm }}>
          <span aria-hidden>🕘</span>
          <h2 style={{ margin: 0, fontSize: 18 }}>{S.overview.recentActivity}</h2>
        </div>

        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: spacing.xs }}>
          {data.activity.map((entry, index) => (
            <li
              key={`${entry.kind}-${index}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing.sm,
                padding: spacing.xs,
                borderRadius: radius.md,
                background: colors.surfaceContainerLow,
                border: `1px solid ${roles.cardBorder}`,
              }}
            >
              <span aria-hidden>{ACTIVITY_ICON[entry.kind]}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14 }}>
                  {ACTIVITY_LABEL[entry.kind]}
                  {entry.label ? `: ${entry.label}` : ''}
                </div>
                {entry.detail ? <div style={muted}>{entry.detail}</div> : null}
              </div>
              <Badge>
                <span style={{ direction: 'ltr', display: 'inline-block' }}>
                  {new Date(entry.at).toLocaleString('en-PK', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </Badge>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
