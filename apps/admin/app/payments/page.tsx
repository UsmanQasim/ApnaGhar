import { isRtlLocale } from '@ghar/shared';

import { adminApi, rupees } from '../../src/api';
import { AlertIcon } from '../../src/icons';
import { getLocale } from '../../src/locale';
import { stringsFor, type AdminStrings } from '../../src/strings';
import { Badge, EmptyState, PageHeader } from '../../src/ui';
import { DecisionForm } from './decision-form';

interface QueueItem {
  id: string;
  amountPaisa: string;
  provider: 'manual_easypaisa' | 'manual_jazzcash';
  providerTxnId: string | null;
  payerMsisdn: string | null;
  proofKey: string | null;
  provisionalUntil: string | null;
  createdAt: string;
  agent: {
    agencyName: string | null;
    user: { name: string | null; phone: string };
  };
  invoice: { number: string; totalPaisa: string } | null;
}

export const dynamic = 'force-dynamic';

/**
 * The manual payment verification queue.
 *
 * This screen is the entire revenue mechanism at launch: until an admin clicks
 * approve here, no manual EasyPaisa/JazzCash transfer becomes real money in
 * the ledger. Everything else in the panel can wait; this cannot.
 *
 * Ordered oldest-first, and each row shows how long the agent's optimistic
 * unblock has left — the queue is a clock, not an inbox.
 */
export default async function PaymentsQueuePage() {
  const [queue, locale] = await Promise.all([
    adminApi<QueueItem[]>('/payments/queue'),
    getLocale(),
  ]);
  const S = stringsFor(locale);
  const intl = isRtlLocale(locale) ? 'ur-PK' : 'en-PK';

  return (
    <>
      <PageHeader
        title={S.payments.title}
        subtitle={
          queue.length === 0
            ? S.payments.nothingWaiting
            : S.payments.awaitingDecision.replace('{count}', String(queue.length))
        }
      />

      {queue.length === 0 ? (
        <div className="card">
          <EmptyState hint={S.payments.nothingWaiting}>{S.overview.nothingPending}</EmptyState>
        </div>
      ) : (
        <ul className="grid list-none gap-md p-0">
          {queue.map((item) => (
            <PaymentRow key={item.id} item={item} S={S} intl={intl} />
          ))}
        </ul>
      )}
    </>
  );
}

function PaymentRow({
  item,
  S,
  intl,
}: {
  item: QueueItem;
  S: AdminStrings;
  intl: string;
}) {
  const expected = item.invoice ? Number(item.invoice.totalPaisa) : null;
  const claimed = Number(item.amountPaisa);

  // Surfaced rather than silently accepted: a mismatch is the single most
  // common reason to reject, and the admin should see it before deciding.
  const mismatch = expected !== null && expected !== claimed;

  const provisionalLeft = item.provisionalUntil
    ? Math.max(0, Math.round((new Date(item.provisionalUntil).getTime() - Date.now()) / 60000))
    : null;

  return (
    <li
      className={[
        'card grid gap-md p-md md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]',
        // A mismatch is the one thing on this screen that must be impossible
        // to miss, so it gets the border as well as the banner below.
        mismatch ? 'border-error' : '',
      ].join(' ')}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-sm">
          <strong className="numeric text-xl font-semibold tracking-tight">
            {rupees(item.amountPaisa)}
          </strong>
          <Badge>
            <span className="capitalize">{item.provider.replace('manual_', '')}</span>
          </Badge>
          {item.invoice ? (
            <span className="numeric text-xs text-on-surface-variant">{item.invoice.number}</span>
          ) : null}
        </div>

        <dl className="mt-sm grid grid-cols-[auto_minmax(0,1fr)] gap-x-sm gap-y-1 text-sm">
          <dt className="text-on-surface-variant">{S.payments.agent}</dt>
          <dd className="m-0 min-w-0 truncate">
            {item.agent.user.name ?? '—'}
            {item.agent.agencyName ? ` · ${item.agent.agencyName}` : ''}
          </dd>

          <dt className="text-on-surface-variant">{S.payments.agentPhone}</dt>
          <dd className="m-0"><span className="numeric">{item.agent.user.phone}</span></dd>

          <dt className="text-on-surface-variant">{S.payments.paidFrom}</dt>
          <dd className="m-0"><span className="numeric">{item.payerMsisdn ?? '—'}</span></dd>

          <dt className="text-on-surface-variant">{S.payments.transactionId}</dt>
          <dd className="m-0"><span className="numeric break-all">{item.providerTxnId ?? '—'}</span></dd>

          <dt className="text-on-surface-variant">{S.payments.submitted}</dt>
          <dd className="m-0">
            <span className="numeric">{new Date(item.createdAt).toLocaleString(intl)}</span>
          </dd>
        </dl>

        {mismatch ? (
          <p className="mt-sm flex items-start gap-xs rounded-md bg-error-container p-sm text-sm text-on-error-container">
            <span className="mt-0.5 shrink-0">
              <AlertIcon size={16} />
            </span>
            {S.payments.amountMismatch
              .replace('{claimed}', rupees(claimed))
              .replace('{expected}', rupees(expected))}
          </p>
        ) : null}

        {provisionalLeft !== null ? (
          <p className="mt-xs mb-0 text-xs text-on-surface-variant">
            {provisionalLeft > 0
              ? S.payments.provisionalLeft.replace('{minutes}', String(provisionalLeft))
              : S.payments.provisionalExpired}
          </p>
        ) : null}
      </div>

      <div className="grid content-start gap-sm">
        {item.proofKey ? (
          // The receipt screenshot is the evidence. Full size in a new tab,
          // because a thumbnail is not enough to read a transaction ID.
          <a
            href={`${process.env['MEDIA_BASE_URL'] ?? ''}/${item.proofKey}`}
            target="_blank"
            rel="noreferrer"
            className="block overflow-hidden rounded-md border border-card-border transition-opacity hover:opacity-90"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${process.env['MEDIA_BASE_URL'] ?? ''}/${item.proofKey}`}
              alt={S.payments.receiptAlt}
              className="block w-full"
            />
          </a>
        ) : (
          <p className="m-0 rounded-md border border-dashed border-outline-variant p-sm text-center text-xs text-on-surface-variant">
            {S.payments.noReceipt}
          </p>
        )}

        {/* A client island: the strings travel with it, because it has no
            server parent to ask for the locale at render time. */}
        <DecisionForm paymentId={item.id} strings={S.payments} />
      </div>
    </li>
  );
}
