import Link from 'next/link';

import { isRtlLocale } from '@ghar/shared';

import { adminApi } from '../src/api';
import { AgentsIcon, AlertIcon, CheckIcon, ListingsIcon } from '../src/icons';
import { getLocale } from '../src/locale';
import { stringsFor, type AdminStrings } from '../src/strings';
import {
  Badge,
  Card,
  EmptyState,
  PageHeader,
  StatTile,
  TableScroll,
  rupees,
} from '../src/ui';

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

type ActivityKind = Overview['activity'][number]['kind'];

/**
 * Built per request, not frozen at module scope: these labels are
 * locale-dependent, and a module-level constant would serve every operator
 * whichever language happened to be imported first.
 */
function activityLabels(S: AdminStrings): Record<ActivityKind, string> {
  return {
    listing: S.overview.newListingLogged,
    agent: S.overview.newAgentLogged,
    payment: S.overview.paymentApproved,
  };
}

/**
 * Drawn icons, not emoji (🏠 👤 ✅). Emoji are rendered by the OS, so the feed
 * arrived in a different style on every machine and carried the platform's own
 * colours regardless of the surface behind them.
 */
const ACTIVITY_ICON: Record<ActivityKind, React.ReactNode> = {
  listing: <ListingsIcon size={16} />,
  agent: <AgentsIcon size={16} />,
  payment: <CheckIcon size={16} />,
};

const ACTIVITY_TONE: Record<ActivityKind, string> = {
  listing: 'bg-secondary-container text-on-secondary-container',
  agent: 'bg-surface-container-high text-on-surface',
  payment: 'bg-primary-fixed text-on-primary-fixed',
};

/**
 * Admin overview.
 *
 * The pending-payments table is placed above recent activity deliberately:
 * activity is interesting, a pending manual transfer is money an agent has
 * already sent and is waiting on. One of these is a to-do list; the other is
 * a feed — and the layout should say which is which before it is read.
 */
export default async function AdminOverviewPage() {
  // Per request, not module scope: the operator's language is a cookie.
  const locale = await getLocale();
  const S = stringsFor(locale);
  const ACTIVITY_LABEL = activityLabels(S);

  const data = await adminApi<Overview>('/admin/overview');
  const intl = isRtlLocale(locale) ? 'ur-PK' : 'en-PK';

  return (
    <>
      <PageHeader title={S.overview.title} subtitle={S.overview.subtitle} />

      <div className="mb-lg grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-md">
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

      {/* ── Pending payments: the to-do list ───────────────────────────── */}
      <Card className="mb-lg">
        <div className="mb-sm flex items-center gap-xs">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-error-container text-on-error-container">
            <AlertIcon size={16} />
          </span>
          <h2 className="m-0 flex-1 text-lg font-semibold">{S.overview.pendingPayments}</h2>
          <Link
            href="/payments"
            className="touch inline-flex items-center rounded-md px-xs text-sm font-medium text-primary transition-colors hover:bg-surface-container-low"
          >
            {S.overview.seeAll}
          </Link>
        </div>

        {data.pendingPayments.length === 0 ? (
          <EmptyState>{S.overview.nothingPending}</EmptyState>
        ) : (
          <TableScroll>
            <table className="data-table">
              <thead>
                <tr>
                  <th>{S.overview.agentName}</th>
                  <th className="num">{S.overview.amount}</th>
                  <th className="num">{S.overview.date}</th>
                  <th>{S.overview.action}</th>
                </tr>
              </thead>
              <tbody>
                {data.pendingPayments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="font-medium">{payment.agentName ?? '—'}</td>
                    <td className="num font-semibold">
                      {rupees(payment.amountPaisa)}
                    </td>
                    <td className="num text-on-surface-variant">
                      {new Date(payment.createdAt).toLocaleDateString(intl, {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td>
                      {/* The decision itself lives on /payments, where the
                          receipt image is visible. Approving from a summary
                          row without seeing the evidence is how wrong
                          approvals happen. */}
                      <Link
                        href="/payments"
                        className="font-medium text-primary underline-offset-4 hover:underline"
                      >
                        {S.overview.seeAll}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
        )}
      </Card>

      {/* ── Activity: the feed ─────────────────────────────────────────── */}
      <Card>
        <h2 className="m-0 mb-sm text-lg font-semibold">{S.overview.recentActivity}</h2>

        {data.activity.length === 0 ? (
          <EmptyState>{S.reports.noData}</EmptyState>
        ) : (
          <ul className="m-0 grid list-none gap-1 p-0">
            {data.activity.map((entry, index) => (
              <li
                key={`${entry.kind}-${index}`}
                // `min-w-0` is load-bearing: these are GRID items, and a grid
                // item's default `min-width: auto` means it refuses to shrink
                // below its content — so the timestamp badge pushed the whole
                // page sideways on a phone, no matter how much truncation the
                // text inside had.
                className="flex min-w-0 items-center gap-sm rounded-md px-xs py-2 transition-colors hover:bg-surface-container-low"
              >
                <span
                  className={`grid size-8 shrink-0 place-items-center rounded-full ${ACTIVITY_TONE[entry.kind]}`}
                >
                  {ACTIVITY_ICON[entry.kind]}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm">
                    {ACTIVITY_LABEL[entry.kind]}
                    {entry.label ? `: ${entry.label}` : ''}
                  </div>
                  {entry.detail ? (
                    <div className="truncate text-xs text-on-surface-variant">{entry.detail}</div>
                  ) : null}
                </div>

                <Badge>
                  <span className="numeric">
                    {new Date(entry.at).toLocaleString(intl, {
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
        )}
      </Card>
    </>
  );
}
