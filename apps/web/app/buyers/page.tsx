import Link from 'next/link';

import { C, copyFor, type WebCopy } from '../../src/copy';
import { getLocale } from '../../src/locale';
import { FeatureCard, Grid, Section, primaryLinkStyle } from '../../src/components/chrome';
import { HeroArt } from '../../src/components/HeroArt';
import {
  CameraIcon,
  CheckIcon,
  ClockIcon,
  LockIcon,
  ShieldCheckIcon,
  VideoIcon,
} from '../../src/components/icons';

// Module scope: metadata is generated per build, not per request, so it
// cannot read the locale cookie. `C` is the default (Urdu) set.
export const metadata = { title: `${C.nav.buyers} — ${C.brand}` };

/** Per request: these labels are locale-dependent. */
function stepsFor(C: WebCopy) {
  return [
    { n: 1, title: C.buyers.step1, body: C.buyers.step1Body },
    { n: 2, title: C.buyers.step2, body: C.buyers.step2Body },
    { n: 3, title: C.buyers.step3, body: C.buyers.step3Body },
    { n: 4, title: C.buyers.step4, body: C.buyers.step4Body },
  ] as const;
}

/**
 * For buyers.
 *
 * Two claims from the Stitch export are deliberately absent, because the
 * product does not do them and a marketing page must not promise what the app
 * will not deliver:
 *
 *  • "ہماری ٹیم ہر پراپرٹی کی فزیکل تصدیق کرتی ہے" — there is no physical
 *    inspection process. Agents are verified; individual properties are not.
 *  • "ہمارے قانونی ماہرین خریداری کے عمل میں رہنمائی کرتے ہیں" — there is no
 *    legal service.
 *
 * What replaces them is a claim the product does keep: the buyer's number is
 * not handed to an agent until the buyer makes contact (see EngagementService).
 */
export default async function BuyersPage() {
  // Per request, not module scope: the visitor's language is a cookie.
  const C = copyFor(await getLocale());
  const STEPS = stepsFor(C);

  return (
    <main className="flex-1">
      <section className="ambient section">
        <div className="shell max-w-[880px] text-center">
          <h1 className="m-0 text-[clamp(28px,4.6vw,44px)] font-bold tracking-tight text-on-surface">
            {C.buyers.heroLine1}
            <br />
            <span className="text-primary">{C.buyers.heroLine2}</span>
          </h1>
          <div className="mt-lg">
            <Link href="/#download" className={primaryLinkStyle}>
              {C.buyers.searchCta}
            </Link>
          </div>
        </div>
      </section>

      {/* ── Video first ───────────────────────────────────────────────── */}
      <Section>
        <div className="grid items-center gap-lg lg:grid-cols-2">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary-container px-sm py-1 text-sm text-on-secondary-container">
              <VideoIcon size={16} />
              {C.buyers.videoFirstEyebrow}
            </span>

            <h2 className="mt-xs mb-xs text-[clamp(22px,3.2vw,30px)] font-bold tracking-tight">
              {C.buyers.videoFirstTitle}
            </h2>
            <p className="mb-md text-[17px] text-on-surface-variant">{C.buyers.videoFirstBody}</p>

            <ul className="m-0 grid list-none gap-sm p-0">
              {[
                { title: C.buyers.saveTime, body: C.buyers.saveTimeBody, icon: <ClockIcon size={18} /> },
                { title: C.buyers.realFootage, body: C.buyers.realFootageBody, icon: <CameraIcon size={18} /> },
              ].map((item) => (
                <li key={item.title} className="flex min-w-0 items-start gap-sm">
                  <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-primary-fixed text-on-primary-fixed">
                    {item.icon}
                  </span>
                  <div className="min-w-0">
                    <strong className="text-[17px]">{item.title}</strong>
                    <p className="m-0 text-[15px] text-on-surface-variant">{item.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Was a 56px ▶️ emoji centred in an empty grey box — the single
              most placeholder-looking element on the site. The same drawn
              illustration as the home hero carries the idea properly. */}
          <div className="card grid place-items-center overflow-hidden bg-surface-container-low p-md">
            <HeroArt className="h-auto w-full max-w-[420px]" />
          </div>
        </div>
      </Section>

      {/* ── Trust ─────────────────────────────────────────────────────── */}
      <Section title={C.buyers.promiseTitle} subtitle={C.buyers.promiseBody} tone="raised">
        <Grid min={300}>
          <FeatureCard
            icon={<ShieldCheckIcon />}
            title={C.home.verifiedAgents}
            body={C.buyers.verifiedAgentsBody}
          />
          <FeatureCard
            icon={<LockIcon />}
            title={C.buyers.privacyTitle}
            body={C.buyers.privacyBody}
          />
        </Grid>
      </Section>

      {/* ── How it works ──────────────────────────────────────────────── */}
      <Section title={C.buyers.howTitle}>
        <Grid min={230}>
          {STEPS.map((step) => (
            <article key={step.n} className="card card-hover flex h-full flex-col gap-xs p-md">
              <span className="numeric grid size-9 place-items-center rounded-full bg-primary text-base font-bold text-on-primary">
                {step.n}
              </span>
              <h3 className="m-0 text-[19px] font-semibold">{step.title}</h3>
              <p className="m-0 text-[15px] text-on-surface-variant">{step.body}</p>
            </article>
          ))}
        </Grid>

        <p className="mt-lg flex items-center justify-center gap-1.5 text-sm text-on-surface-variant">
          <span className="text-primary">
            <CheckIcon />
          </span>
          {C.buyers.privacyBody}
        </p>
      </Section>
    </main>
  );
}
