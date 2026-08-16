import { adminApi, rupees } from '../../src/api';
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
  const queue = await adminApi<QueueItem[]>('/payments/queue');

  return (
    <main style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 24 }}>Payment verification</h1>
        <p style={{ color: '#3d4a42', margin: '4px 0 0' }}>
          {queue.length === 0
            ? 'Nothing waiting.'
            : `${queue.length} payment${queue.length === 1 ? '' : 's'} awaiting a decision, oldest first.`}
        </p>
      </header>

      {queue.length === 0 ? null : (
        <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 16 }}>
          {queue.map((item) => (
            <PaymentRow key={item.id} item={item} />
          ))}
        </ul>
      )}
    </main>
  );
}

function PaymentRow({ item }: { item: QueueItem }) {
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
        border: `1px solid ${mismatch ? '#ba1a1a' : '#dce9ff'}`,
        borderRadius: 16,
        padding: 16,
        background: '#ffffff',
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)',
        gap: 16,
      }}
    >
      <div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'baseline', flexWrap: 'wrap' }}>
          <strong style={{ fontSize: 20 }}>{rupees(item.amountPaisa)}</strong>
          <span style={badge}>{item.provider.replace('manual_', '')}</span>
          {item.invoice ? <span style={muted}>{item.invoice.number}</span> : null}
        </div>

        <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 12px', margin: '12px 0 0' }}>
          <dt style={muted}>Agent</dt>
          <dd style={cell}>
            {item.agent.user.name ?? '—'}
            {item.agent.agencyName ? ` · ${item.agent.agencyName}` : ''}
          </dd>

          <dt style={muted}>Agent phone</dt>
          <dd style={cell}>{item.agent.user.phone}</dd>

          <dt style={muted}>Paid from</dt>
          <dd style={cell}>{item.payerMsisdn ?? '—'}</dd>

          <dt style={muted}>Transaction ID</dt>
          <dd style={{ ...cell, fontFamily: 'monospace' }}>{item.providerTxnId ?? '—'}</dd>

          <dt style={muted}>Submitted</dt>
          <dd style={cell}>{new Date(item.createdAt).toLocaleString('en-PK')}</dd>
        </dl>

        {mismatch ? (
          <p style={alert}>
            Amount does not match the invoice: agent claims {rupees(claimed)}, invoice is{' '}
            {rupees(expected)}.
          </p>
        ) : null}

        {provisionalLeft !== null ? (
          <p style={{ ...muted, marginTop: 8 }}>
            {provisionalLeft > 0
              ? `Agent is provisionally unblocked for another ${provisionalLeft} min.`
              : 'Provisional access has expired — this agent is currently blocked.'}
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
              alt="Payment receipt"
              style={{ width: '100%', borderRadius: 8, border: '1px solid #dce9ff' }}
            />
          </a>
        ) : (
          <p style={muted}>No receipt uploaded.</p>
        )}

        <DecisionForm paymentId={item.id} />
      </div>
    </li>
  );
}

const muted: React.CSSProperties = { color: '#6d7a72', fontSize: 13, margin: 0 };
const cell: React.CSSProperties = { margin: 0, fontSize: 14 };
const badge: React.CSSProperties = {
  background: '#e5eeff',
  borderRadius: 999,
  padding: '2px 10px',
  fontSize: 12,
  textTransform: 'capitalize',
};
const alert: React.CSSProperties = {
  background: '#ffdad6',
  color: '#93000a',
  borderRadius: 8,
  padding: 12,
  marginTop: 12,
  fontSize: 14,
};
