import { colors, spacing } from '@ghar/ui';

import { adminApi } from '../../src/api';
import { getLocale } from '../../src/locale';
import { stringsFor } from '../../src/strings';
import { Badge, Card, PageHeader, muted, rupees, tableStyle, tdStyle, thStyle } from '../../src/ui';
import { RowActions } from './row-actions';

interface AgentRow {
  userId: string;
  agencyName: string | null;
  isVerified: boolean;
  city: string | null;
  ratingAvg: number | null;
  ratingCount: number;
  listingCount: number;
  revenuePaisa: number;
  user: { name: string | null; phone: string; status: 'active' | 'suspended' };
}

export const dynamic = 'force-dynamic';

/**
 * Agent management.
 *
 * `revenuePaisa` counts VERIFIED payments only. Including pending manual
 * transfers would inflate the number an operator uses to decide who matters,
 * and manual transfers are exactly the ones that sometimes never arrive.
 */
export default async function AgentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; verified?: string }>;
}) {
  // Per request, not module scope: the operator's language is a cookie.
  const S = stringsFor(await getLocale());

  const params = await searchParams;
  const query = new URLSearchParams();
  if (params.q) query.set('q', params.q);
  if (params.verified) query.set('verified', params.verified);

  const agents = await adminApi<AgentRow[]>(`/admin/agents?${query.toString()}`);

  return (
    <>
      <PageHeader title={S.agents.title} subtitle={S.agents.subtitle} />

      {/* Filters are a plain GET form: no client JS, and the filtered view is
          a shareable URL an operator can send to a colleague. */}
      <form
        method="get"
        style={{ display: 'flex', gap: spacing.xs, flexWrap: 'wrap', marginBottom: spacing.md }}
      >
        <input
          name="q"
          defaultValue={params.q ?? ''}
          placeholder={S.agents.searchPlaceholder}
          aria-label={S.agents.searchPlaceholder}
          style={{
            flex: '1 1 260px',
            minHeight: spacing.touchTarget,
            padding: `0 ${spacing.sm}px`,
            borderRadius: 12,
            border: `1px solid ${colors.outlineVariant}`,
            fontFamily: 'inherit',
            fontSize: 14,
          }}
        />
        <select
          name="verified"
          defaultValue={params.verified ?? ''}
          aria-label={S.agents.status}
          style={{
            minHeight: spacing.touchTarget,
            padding: `0 ${spacing.sm}px`,
            borderRadius: 12,
            border: `1px solid ${colors.outlineVariant}`,
            fontFamily: 'inherit',
            fontSize: 14,
          }}
        >
          <option value="">{S.agents.all}</option>
          <option value="true">{S.agents.verified}</option>
          <option value="false">{S.agents.unverified}</option>
        </select>
        <button type="submit" style={filterButton}>
          {S.agents.filter}
        </button>
      </form>

      <Card style={{ overflowX: 'auto' }}>
        {agents.length === 0 ? (
          <p style={muted}>{S.agents.none}</p>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>{S.agents.detail}</th>
                <th style={thStyle}>{S.agents.status}</th>
                <th style={thStyle}>{S.agents.totalListings}</th>
                <th style={thStyle}>{S.agents.revenue}</th>
                <th style={thStyle}>{S.agents.rating}</th>
                <th style={thStyle}>{S.agents.action}</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((agent) => {
                const suspended = agent.user.status === 'suspended';
                return (
                  <tr key={agent.userId}>
                    <td style={tdStyle}>
                      <div style={{ fontSize: 15 }}>{agent.user.name ?? '—'}</div>
                      <div style={muted}>{agent.agencyName ?? S.agents.independent}</div>
                      {/* A phone number must never mirror inside an RTL cell. */}
                      <div style={{ ...muted, direction: 'ltr', textAlign: 'start' }}>
                        {agent.user.phone}
                      </div>
                    </td>
                    <td style={tdStyle}>
                      {suspended ? (
                        <Badge tone="bad">{S.agents.blocked}</Badge>
                      ) : agent.isVerified ? (
                        <Badge tone="good">{S.agents.verified}</Badge>
                      ) : (
                        <Badge tone="warn">{S.agents.unverified}</Badge>
                      )}
                    </td>
                    <td style={{ ...tdStyle, direction: 'ltr', textAlign: 'end' }}>
                      {agent.listingCount.toLocaleString('en-PK')}
                    </td>
                    <td style={{ ...tdStyle, direction: 'ltr', textAlign: 'end' }}>
                      {rupees(agent.revenuePaisa)}
                    </td>
                    <td style={{ ...tdStyle, direction: 'ltr', textAlign: 'end' }}>
                      {agent.ratingAvg === null ? '—' : `★ ${agent.ratingAvg.toFixed(1)}`}
                    </td>
                    <td style={tdStyle}>
                      <RowActions
                        agentId={agent.userId}
                        verified={agent.isVerified}
                        suspended={suspended}
                        strings={S}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}

const filterButton = {
  minHeight: spacing.touchTarget,
  padding: `0 ${spacing.md}px`,
  borderRadius: 12,
  border: 'none',
  background: colors.primary,
  color: colors.onPrimary,
  fontFamily: 'inherit',
  fontSize: 14,
  cursor: 'pointer',
};
