import type { Metadata } from 'next';

import { AreaUnit, isRtlLocale, PriceVisibility, type Locale } from '@ghar/shared';
import { formatArea, formatPrice, formatTimeRemaining } from '@ghar/i18n';

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
 *
 * It is also the only thing many customers will ever see of the product, and
 * it reflects on the agent who sent it — which is why it is worth as much
 * design attention as the marketing site, not less.
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

  // The area used to be `${areaValue} ${areaUnit}` — the unit straight out of
  // the database, which is the enum's English name. An Urdu reader was shown
  // "5 marla" instead of "۵ مرلہ". formatArea() has the words for all three
  // locales and applies the reader's numeral system too.
  const area = formatArea(property.areaValue, property.areaUnit as AreaUnit, { locale });

  const facts = [
    property.bedrooms !== null ? { label: C.listing.bedrooms, value: property.bedrooms } : null,
    property.bathrooms !== null ? { label: C.listing.bathrooms, value: property.bathrooms } : null,
    { label: C.listing.area, value: area, phrase: true },
  ].filter(Boolean) as Array<{ label: string; value: string | number; phrase?: boolean }>;

  return (
    <main className="mx-auto grid max-w-[560px] gap-sm p-md">
      {/* ── Media ──────────────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-lg bg-inverse-surface">
        {video ? (
          <video
            controls
            playsInline
            preload="none"
            poster={poster}
            className="block aspect-video w-full"
          >
            <source src={video} type="application/x-mpegURL" />
          </video>
        ) : poster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={poster} alt="" className="block aspect-video w-full object-cover" />
        ) : (
          <div className="grid aspect-video place-items-center text-inverse-on-surface/40">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="2.5" y="6" width="13" height="12" rx="2.5" />
              <path d="M15.5 10.5 21 7.5v9l-5.5-3z" />
            </svg>
          </div>
        )}
      </div>

      {/* ── Price and title ────────────────────────────────────────────── */}
      <div>
        <span className="inline-block rounded-full bg-price-background px-sm py-1 text-lg font-bold text-price-text">
          {/* No `.numeric` here. formatPrice returns a phrase in the reader's
              own language — "۸.۵ کروڑ روپے", "8.5 crore rupay", "Rs 8.5 Crore"
              — not a bare figure. `.numeric` forces LTR, which put the Urdu
              number on the *left* of its own words: an Urdu reader, coming
              from the right, met "کروڑ روپے" before the amount. The phrase is
              already in the page's script and direction; leave it alone. */}
          <span>{price}</span>
        </span>

        {/* `.urdu` because these come out of the database in Nastaliq no matter
            which language the visitor picked — see @ghar/ui/web-base.css. */}
        <h1 className="urdu mt-sm mb-1 text-[22px] font-bold tracking-tight text-on-surface">
          {property.titleUr}
        </h1>

        {/* The list separator is script-specific: an Arabic comma inside a
            Latin-script line reads as a glyph error. */}
        <p className="urdu m-0 text-[15px] text-on-surface-variant">
          {[property.locality, property.city].filter(Boolean).join(isRtlLocale(locale) ? '، ' : ', ')}
        </p>
      </div>

      {/* The expiry warning is prominent and states a time, not a policy. The
          customer needs to know to act now, not to understand our rules. */}
      {remaining ? (
        <p className="m-0 flex items-center gap-xs rounded-md bg-warning-background px-sm py-2 text-[15px] text-warning-text">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="shrink-0"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5.25l3.25 2" />
          </svg>
          {/* NOT `.numeric`. formatTimeRemaining returns a whole phrase —
              "۲ دن باقی", "2 din baqi" — and forcing that LTR threw the Urdu
              numeral to the far end of the line: "یہ لنک  دن باقی ۲". The
              phrase is already in the reader's language and direction. */}
          <span>
            {C.listing.linkNotice} {remaining}
          </span>
        </p>
      ) : null}

      {/* ── Facts ──────────────────────────────────────────────────────── */}
      <dl className="m-0 grid grid-cols-3 gap-2">
        {facts.map((fact) => (
          <div key={fact.label} className="card grid gap-0.5 p-sm text-center">
            <dd
              className={`m-0 text-lg font-bold text-on-surface ${fact.phrase ? '' : 'numeric'}`}
            >
              {fact.value}
            </dd>
            <dt className="text-xs text-on-surface-variant">{fact.label}</dt>
          </div>
        ))}
      </dl>

      {property.descriptionUr ? (
        <p className="urdu m-0 text-[16px] text-on-surface">{property.descriptionUr}</p>
      ) : null}

      {/* ── Agent ──────────────────────────────────────────────────────── */}
      <div className="card flex items-center gap-sm p-sm">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-secondary-container text-on-secondary-container">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="8.5" r="3.5" />
            <path d="M5 20a7 7 0 0 1 14 0" />
          </svg>
        </span>

        <div className="min-w-0 flex-1">
          {/* A person's name may be in either script, so the browser decides
              from the first strong character rather than us guessing. */}
          <div dir="auto" className="auto-dir truncate font-semibold">
            {property.agent.user.name ?? '—'}
          </div>
          {property.agent.agencyName ? (
            <div dir="auto" className="auto-dir truncate text-xs text-on-surface-variant">
              {property.agent.agencyName}
            </div>
          ) : null}
        </div>

        {property.agent.isVerified ? (
          <span className="shrink-0 rounded-full bg-verified-background px-2.5 py-0.5 text-xs font-medium text-verified-text">
            {C.listing.verified}
          </span>
        ) : null}
      </div>

      {/* ── Actions: the two things this page exists for ───────────────── */}
      <div className="mt-1 grid grid-cols-2 gap-sm">
        <a
          href={`tel:${property.agent.user.phone}`}
          className="touch inline-flex items-center justify-center gap-xs rounded-md bg-primary text-[16px] font-semibold text-on-primary no-underline transition-colors hover:bg-primary-container"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M6.5 3.5h3l1.5 4-2 1.5a12 12 0 0 0 6 6l1.5-2 4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.5 5.7 2 2 0 0 1 6.5 3.5Z" />
          </svg>
          {C.listing.call}
        </a>

        <a
          href={`https://wa.me/${property.agent.user.phone.replace('+', '')}`}
          className="touch inline-flex items-center justify-center gap-xs rounded-md border border-outline-variant bg-card-background text-[16px] font-semibold text-on-surface no-underline transition-colors hover:border-outline hover:bg-surface-container-low"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M20.5 12c0 4.14-3.8 7.5-8.5 7.5a9.9 9.9 0 0 1-2.6-.34L4.5 20.5l1.2-3.4A7.1 7.1 0 0 1 3.5 12c0-4.14 3.8-7.5 8.5-7.5s8.5 3.36 8.5 7.5Z" />
          </svg>
          {C.listing.whatsapp}
        </a>
      </div>

      <hr className="hairline my-sm" />

      <LanguageSwitcher active={locale} label={C.language} />
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
    <main className="mx-auto grid max-w-[460px] justify-items-center gap-sm px-md py-[18vh] text-center">
      <span className="grid size-14 place-items-center rounded-full bg-warning-background text-warning-text">
        <svg
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5.25l3.25 2" />
        </svg>
      </span>

      <h1 className="m-0 text-[22px] font-bold tracking-tight text-on-surface">{message}</h1>
      <p className="m-0 text-[15px] text-on-surface-variant">{C.expired.askForNew}</p>

      <div className="mt-md">
        <LanguageSwitcher active={locale} label={C.language} />
      </div>
    </main>
  );
}
