import { colors, radius, roles, spacing } from '@ghar/ui';

import { adminApi, rupees } from '../../src/api';
import { getLocale } from '../../src/locale';
import { stringsFor, type AdminStrings } from '../../src/strings';
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

  return (
    <main style={{ padding: spacing.lg, maxWidth: 1100, margin: '0 auto' }}>
      <header style={{ marginBottom: spacing.lg }}>
        <h1 style={{ margin: 0, fontSize: 24 }}>{S.payments.title}</h1>
        <p style={{ color: colors.onSurfaceVariant, margin: `${spacing.base}px 0 0` }}>
          {queue.length === 0
            ? S.payments.nothingWaiting
            : S.payments.awaitingDecision.replace('{count}', String(queue.length))}
        </p>
      </header>

      {queue.length === 0 ? null : (
        <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: spacing.md }}>
          {queue.map((item) => (
            <PaymentRow key={item.id} item={item} S={S} />
          ))}
        </ul>
      )}
    </main>
  );
}

function PaymentRow({ item, S }: { item: QueueItem; S: AdminStrings }) {
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
      style={{
        border: `1px solid ${mismatch ? colors.error : roles.cardBorder}`,
        borderRadius: radius.lg,
        padding: spacing.md,
        background: roles.cardBackground,
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)',
        gap: spacing.md,
      }}
    >
      <div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'baseline', flexWrap: 'wrap' }}>
          <strong style={{ fontSize: 20 }}>{rupees(item.amountPaisa)}</strong>
          <span style={badge}>{item.provider.replace('manual_', '')}</span>
          {item.invoice ? <span style={muted}>{item.invoice.number}</span> : null}
        </div>

        <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 12px', margin: '12px 0 0' }}>
          <dt style={muted}>{S.payments.agent}</dt>
          <dd style={cell}>
            {item.agent.user.name ?? '—'}
            {item.agent.agencyName ? ` · ${item.agent.agencyName}` : ''}
          </dd>

          <dt style={muted}>{S.payments.agentPhone}</dt>
          <dd style={cell}>{item.agent.user.phone}</dd>

          <dt style={muted}>{S.payments.paidFrom}</dt>
          <dd style={cell}>{item.payerMsisdn ?? '—'}</dd>

          <dt style={muted}>{S.payments.transactionId}</dt>
          <dd style={{ ...cell, fontFamily: 'monospace' }}>{item.providerTxnId ?? '—'}</dd>

          <dt style={muted}>{S.payments.submitted}</dt>
          <dd style={cell}>{new Date(item.createdAt).toLocaleString('en-PK')}</dd>
        </dl>

        {mismatch ? (
          <p style={alert}>
            {S.payments.amountMismatch
              .replace('{claimed}', rupees(claimed))
              .replace('{expected}', rupees(expected))}
          </p>
        ) : null}

        {provisionalLeft !== null ? (
          <p style={{ ...muted, marginTop: 8 }}>
            {provisionalLeft > 0
              ? S.payments.provisionalLeft.replace('{minutes}', String(provisionalLeft))
              : S.payments.provisionalExpired}
          </p>
        ) : null}
      </div>

      <div style={{ display: 'grid', gap: 12 }}>
        {item.proofKey ? (
          // The receipt screenshot is the evidence. Full size in a new tab,
          // because a thumbnail is not enough to read a transaction ID.
          <a
            href={`${process.env['MEDIA_BASE_URL'] ?? ''}/${item.proofKey}`}
            target="_blank"
            rel="noreferrer"
            style={{ display: 'block' }}
          >
            <img
              src={`${process.env['MEDIA_BASE_URL'] ?? ''}/${item.proofKey}`}
              alt={S.payments.receiptAlt}
              style={{ width: '100%', borderRadius: radius.DEFAULT, border: `1px solid ${roles.cardBorder}` }}
            />
          </a>
        ) : (
          <p style={muted}>{S.payments.noReceipt}</p>
        )}

        {/* A client island: the strings travel with it, because it has no
            server parent to ask for the locale at render time. */}
        <DecisionForm paymentId={item.id} strings={S.payments} />
      </div>
    </li>
  );
}

const muted: React.CSSProperties = { color: colors.onSurfaceVariant, fontSize: 13, margin: 0 };
const cell: React.CSSProperties = { margin: 0, fontSize: 14 };
const badge: React.CSSProperties = {
  background: colors.secondaryContainer,
  borderRadius: radius.full,
  padding: '2px 10px',
  fontSize: 12,
  textTransform: 'capitalize',
};
const alert: React.CSSProperties = {
  background: colors.errorContainer,
  color: colors.onErrorContainer,
  borderRadius: radius.DEFAULT,
  padding: spacing.sm,
  marginTop: spacing.sm,
  fontSize: 14,
};
