import type { Metadata } from 'next';

import { isRtlLocale, PriceVisibility, type Locale } from '@ghar/shared';
import { formatPrice, formatTimeRemaining } from '@ghar/i18n';
import { colors, radius, roles, spacing } from '@ghar/ui';

import { LanguageSwitcher } from '../../../src/LanguageSwitcher';
import { copyFor } from '../../../src/copy';
import { getLocale } from '../../../src/locale';

interface ShareResponse {
  ok: boolean;
  reason?: 'not_found' | 'revoked' | 'expired' | 'view_limit_reached';
  property?: {
    id: string;
    titleUr: string;
    descriptionUr: string | null;
    pricePaisa: string | null;
    priceVisibility: PriceVisibility;
    city: string;
    locality: string | null;
    bedrooms: number | null;
    bathrooms: number | null;
    areaValue: number;
    areaUnit: string;
    media: Array<{ thumbnailUrl: string | null; playbackUrl: string | null; kind: string }>;
    agent: {
      agencyName: string | null;
      isVerified: boolean;
      user: { name: string | null; phone: string };
    };
  };
  expiresAt?: string | null;
}

/**
 * The share page — a plain server-rendered page, no app install, no account.
 *
 * This is the screen an agent's customer opens from WhatsApp, often on a cheap
 * phone on mobile data. It ships no client JS beyond the video element: every
 * kilobyte here is a kilobyte of someone's data bundle.
 */

// Never cached, and never indexed. A private listing reachable only by token
// must not end up in a search engine or a CDN edge cache.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

async function fetchShare(token: string): Promise<ShareResponse> {
  // Note: no /api suffix. main.ts excludes `s/:token` from the global prefix,
  // so this base URL is the bare API origin — unlike the admin panel, which
  // sets API_BASE_URL *with* /api. Same variable name, different value.
  const base = process.env['API_BASE_URL'] ?? 'http://localhost:3000';

  // fetch() rejects outright when the host is unreachable — API not deployed,
  // asleep on a free tier, DNS wrong. Unhandled, that renders a bare 500 to a
  // customer who just tapped a WhatsApp link. Degrade to the expired-state
  // screen instead: it is the same thing they would see for a dead link, and
  // it tells them what to do about it.
  let response: Response;
  try {
    response = await fetch(`${base}/s/${encodeURIComponent(token)}`, { cache: 'no-store' });
  } catch {
    return { ok: false, reason: 'not_found' };
  }

  if (!response.ok) return { ok: false, reason: 'not_found' };

  try {
    return (await response.json()) as ShareResponse;
  } catch {
    return { ok: false, reason: 'not_found' };
  }
}

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [data, locale] = await Promise.all([fetchShare(token), getLocale()]);
  const C = copyFor(locale);

  if (!data.ok || !data.property) {
    return <ExpiredState reason={data.reason ?? 'not_found'} locale={locale} />;
  }

  const { property } = data;
  const onRequest = property.priceVisibility === PriceVisibility.ON_REQUEST;
  // Was hardcoded `{ locale: 'ur' }`: the price and the countdown are the two
  // pieces of formatted text on this page, and both would have stayed in
  // Nastaliq no matter which language the customer picked.
  const price = onRequest
    ? C.listing.priceOnRequest
    : formatPrice(Number(property.pricePaisa ?? 0), { locale });

  const remaining = data.expiresAt
    ? formatTimeRemaining(new Date(data.expiresAt), { locale })
    : null;

  const poster = property.media.find((m) => m.thumbnailUrl)?.thumbnailUrl ?? undefined;
  const video = property.media.find((m) => m.kind === 'video')?.playbackUrl;

  return (
    <main style={page}>
      {video ? (
        <video
          controls
          playsInline
          preload="none"
          poster={poster}
          style={{ width: '100%', borderRadius: radius.lg, background: colors.inverseSurface }}
        >
          <source src={video} type="application/x-mpegURL" />
        </video>
      ) : poster ? (
        <img src={poster} alt="" style={{ width: '100%', borderRadius: radius.lg }} />
      ) : null}

      <div style={pill}>{price}</div>

      <h1 style={heading}>{property.titleUr}</h1>
      {/* The list separator is script-specific: an Arabic comma inside a
          Latin-script line reads as a glyph error. */}
      <p style={subtle}>
        {[property.locality, property.city].filter(Boolean).join(isRtlLocale(locale) ? '، ' : ', ')}
      </p>

      {/* The expiry warning is prominent and states a time, not a policy. The
          customer needs to know to act now, not to understand our rules. */}
      {remaining ? (
        <div style={warning}>
          {C.listing.linkNotice} {remaining}
        </div>
      ) : null}

      <dl style={factGrid}>
        {property.bedrooms !== null ? (
          <Fact label={C.listing.bedrooms} value={property.bedrooms} />
        ) : null}
        {property.bathrooms !== null ? (
          <Fact label={C.listing.bathrooms} value={property.bathrooms} />
        ) : null}
        <Fact label={C.listing.area} value={`${property.areaValue} ${property.areaUnit}`} />
      </dl>

      {property.descriptionUr ? <p style={body}>{property.descriptionUr}</p> : null}

      <div style={actions}>
        <a href={`tel:${property.agent.user.phone}`} style={primaryButton}>
          {C.listing.call}
        </a>
        <a
          href={`https://wa.me/${property.agent.user.phone.replace('+', '')}`}
          style={secondaryButton}
        >
          {C.listing.whatsapp}
        </a>
      </div>

      <div style={{ marginTop: spacing.lg }}>
        <LanguageSwitcher active={locale} label={C.language} />
      </div>
    </main>
  );
}

/**
 * A dead link gets a polite explanation and a way forward — never a raw 404.
 * To the customer, a broken page reads as "the agent sent me something fake",
 * which costs the agent a sale and us an agent.
 */
function ExpiredState({ reason, locale }: { reason: string; locale: Locale }) {
  const C = copyFor(locale);

  const message =
    reason === 'view_limit_reached'
      ? C.expired.onceOnly
      : reason === 'revoked'
        ? C.expired.revoked
        : C.expired.generic;

  return (
    <main style={{ ...page, textAlign: 'center', paddingTop: 96 }}>
      <h1 style={heading}>{message}</h1>
      <p style={subtle}>{C.expired.askForNew}</p>

      <div style={{ marginTop: spacing.lg, justifyContent: 'center', display: 'flex' }}>
        <LanguageSwitcher active={locale} label={C.language} />
      </div>
    </main>
  );
}

function Fact({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={factCard}>
      <dd style={{ ...factValue, margin: 0 }}>{value}</dd>
      <dt style={subtle}>{label}</dt>
    </div>
  );
}

// Inline styles rather than a CSS file: this page is one route, and inlining
// removes a render-blocking request on a slow connection.
const page: React.CSSProperties = {
  maxWidth: 560,
  margin: '0 auto',
  padding: spacing.md,
  background: colors.surface,
  color: colors.onSurface,
  minHeight: '100vh',
};

const heading: React.CSSProperties = { fontSize: 24, margin: `${spacing.sm}px 0 0` };
const subtle: React.CSSProperties = { color: colors.onSurfaceVariant, fontSize: 16 };
const body: React.CSSProperties = { fontSize: 16 };

const pill: React.CSSProperties = {
  display: 'inline-block',
  background: roles.priceBackground,
  color: roles.priceText,
  padding: `${spacing.base}px ${spacing.sm}px`,
  borderRadius: radius.full,
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  fontWeight: 700,
  marginTop: spacing.sm,
};

const warning: React.CSSProperties = {
  background: roles.warningBackground,
  color: roles.warningText,
  padding: spacing.sm,
  borderRadius: radius.md,
  margin: `${spacing.sm}px 0`,
};

const factGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
  gap: spacing.sm,
  margin: `${spacing.md}px 0`,
};

const factCard: React.CSSProperties = {
  background: roles.cardBackground,
  border: `1px solid ${roles.cardBorder}`,
  borderRadius: radius.md,
  padding: spacing.sm,
  textAlign: 'center',
};

const factValue: React.CSSProperties = {
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  fontWeight: 700,
  fontSize: 20,
};

const buttonBase: React.CSSProperties = {
  flex: 1,
  minHeight: spacing.touchTarget,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: radius.md,
  textDecoration: 'none',
  fontSize: 18,
};

const primaryButton: React.CSSProperties = {
  ...buttonBase,
  background: colors.primary,
  color: colors.onPrimary,
};

const secondaryButton: React.CSSProperties = {
  ...buttonBase,
  background: colors.surfaceContainerLowest,
  color: colors.primary,
  border: `1px solid ${colors.primary}`,
};

const actions: React.CSSProperties = {
  display: 'flex',
  gap: spacing.sm,
  position: 'sticky',
  bottom: spacing.md,
};
