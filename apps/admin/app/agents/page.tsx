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
      <form method="get" className="mb-md flex flex-wrap gap-xs">
        <input
          name="q"
          defaultValue={params.q ?? ''}
          placeholder={S.agents.searchPlaceholder}
          aria-label={S.agents.searchPlaceholder}
          className={`${fieldStyle} min-w-0 flex-1 basis-[240px]`}
        />
        <select
          name="verified"
          defaultValue={params.verified ?? ''}
          aria-label={S.agents.status}
          className={fieldStyle}
        >
          <option value="">{S.agents.all}</option>
          <option value="true">{S.agents.verified}</option>
          <option value="false">{S.agents.unverified}</option>
        </select>
        <button type="submit" className={primaryButtonStyle}>
          {S.agents.filter}
        </button>
      </form>

      <Card>
        {agents.length === 0 ? (
          <EmptyState hint={S.agents.searchPlaceholder}>{S.agents.none}</EmptyState>
        ) : (
          <TableScroll>
            <table className="data-table">
              <thead>
                <tr>
                  <th>{S.agents.detail}</th>
                  <th>{S.agents.status}</th>
                  <th className="num">{S.agents.totalListings}</th>
                  <th className="num">{S.agents.revenue}</th>
                  <th className="num">{S.agents.rating}</th>
                  <th>{S.agents.action}</th>
                </tr>
              </thead>
              <tbody>
                {agents.map((agent) => {
                  const suspended = agent.user.status === 'suspended';
                  return (
                    <tr key={agent.userId}>
                      <td>
                        <div className="font-medium">{agent.user.name ?? '—'}</div>
                        <div className="text-xs text-on-surface-variant">
                          {agent.agencyName ?? S.agents.independent}
                        </div>
                        {/* A phone number must never mirror inside an RTL cell. */}
                        <div className="numeric text-xs text-on-surface-variant">
                          {agent.user.phone}
                        </div>
                      </td>
                      <td>
                        {suspended ? (
                          <Badge tone="bad">{S.agents.blocked}</Badge>
                        ) : agent.isVerified ? (
                          <Badge tone="good">{S.agents.verified}</Badge>
                        ) : (
                          <Badge tone="warn">{S.agents.unverified}</Badge>
                        )}
                      </td>
                      <td className="num">
                        {agent.listingCount.toLocaleString('en-PK')}
                      </td>
                      <td className="num font-medium">{rupees(agent.revenuePaisa)}</td>
                      <td className="num">
                        {agent.ratingAvg === null ? '—' : `★ ${agent.ratingAvg.toFixed(1)}`}
                      </td>
                      <td>
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
          </TableScroll>
        )}
      </Card>
    </>
  );
}
