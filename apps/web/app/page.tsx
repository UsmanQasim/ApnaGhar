import Link from 'next/link';

import { C, copyFor } from '../src/copy';
import { getLocale } from '../src/locale';
import { HeroArt } from '../src/components/HeroArt';
import {
  FeatureCard,
  Grid,
  Section,
  primaryLinkStyle,
  secondaryLinkStyle,
} from '../src/components/chrome';
import {
  BoltIcon,
  ChartIcon,
  ChatIcon,
  MicIcon,
  ShieldCheckIcon,
  SparkIcon,
  VideoIcon,
} from '../src/components/icons';

// Module scope: metadata is generated per build, not per request, so it
// cannot read the locale cookie. `C` is the default (Urdu) set.
export const metadata = { title: `${C.brand} — ${C.tagline}` };

export default async function HomePage() {
  // Per request, not module scope: the visitor's language is a cookie.
  const copy = copyFor(await getLocale());

  return (
    <main>
      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="ambient section overflow-hidden">
        <div className="shell grid items-center gap-lg lg:grid-cols-[1.05fr_1fr]">
          <div className="min-w-0 text-center lg:text-start">
            <h1 className="m-0 text-[clamp(30px,5vw,50px)] font-bold tracking-tight text-on-surface">
              {copy.home.heroLine1}{' '}
              <span className="whitespace-nowrap text-primary">{copy.home.heroHighlight}</span>{' '}
              {copy.home.heroLine2}
            </h1>

            <p className="mx-auto mt-sm mb-lg max-w-[52ch] text-[18px] text-on-surface-variant lg:mx-0">
              {copy.home.heroSub}
            </p>

            <div className="flex flex-wrap justify-center gap-sm lg:justify-start">
              <Link href="#download" className={primaryLinkStyle}>
                {copy.nav.download}
              </Link>
              <Link href="/buyers" className={secondaryLinkStyle}>
                {copy.home.seeListings}
              </Link>
            </div>

            {/*
             * A quiet trust strip rather than invented statistics. Every claim
             * here is one the product actually keeps — see the note in
             * buyers/page.tsx about the two claims deliberately not made.
             */}
            <ul className="mt-lg flex flex-wrap justify-center gap-x-md gap-y-2 p-0 text-sm text-on-surface-variant lg:justify-start">
              {[copy.home.videoTours, copy.home.verifiedAgents, copy.home.voiceSearch].map(
                (item) => (
                  <li key={item} className="flex list-none items-center gap-1.5">
                    <span className="size-1.5 shrink-0 rounded-full bg-primary" />
                    {item}
                  </li>
                ),
              )}
            </ul>
          </div>

          {/* Hidden below lg: at phone widths the headline and CTAs are the
              whole job, and a 360px illustration above them pushes both below
              the fold. */}
          <HeroArt className="hidden h-auto w-full max-w-[460px] justify-self-center lg:block" />
        </div>
      </section>

      {/* ── For buyers ────────────────────────────────────────────────── */}
      <Section title={copy.home.buyersTitle} subtitle={copy.home.buyersSub}>
        <Grid>
          <FeatureCard
            icon={<VideoIcon />}
            title={copy.home.videoTours}
            body={copy.home.videoToursBody}
          />
          <FeatureCard
            icon={<ShieldCheckIcon />}
            title={copy.home.verifiedAgents}
            body={copy.home.verifiedAgentsBody}
          />
          <FeatureCard
            icon={<ChatIcon />}
            title={copy.home.directContact}
            body={copy.home.directContactBody}
          />
          <FeatureCard
            icon={<MicIcon />}
            title={copy.home.voiceSearch}
            body={copy.home.voiceSearchBody}
          />
        </Grid>
      </Section>

      {/* ── For agents ────────────────────────────────────────────────── */}
      <Section title={copy.home.agentsTitle} subtitle={copy.home.agentsSub} tone="raised">
        <Grid min={280}>
          <FeatureCard
            icon={<SparkIcon />}
            title={copy.home.premiumLeads}
            body={copy.home.premiumLeadsBody}
          />
          <FeatureCard
            icon={<ChartIcon />}
            title={copy.home.analytics}
            body={copy.home.analyticsBody}
          />
          <FeatureCard
            icon={<BoltIcon />}
            title={copy.home.fasterSales}
            body={copy.home.fasterSalesBody}
          />
        </Grid>

        <div className="mt-lg text-center">
          <Link href="/agents" className={primaryLinkStyle}>
            {copy.home.registerAsAgent}
          </Link>
        </div>
      </Section>

      {/* ── Download ──────────────────────────────────────────────────── */}
      <Section id="download">
        <div className="relative overflow-hidden rounded-xl bg-inverse-surface px-md py-xl text-center text-inverse-on-surface">
          {/* A single soft highlight, so the block has depth without becoming
              a second hero. */}
          <div
            className="pointer-events-none absolute inset-0 opacity-30"
            style={{
              background:
                'radial-gradient(60% 90% at 50% 0%, var(--ghar-color-primary-container) 0%, transparent 70%)',
            }}
          />

          <div className="relative">
            <h2 className="m-0 text-[clamp(22px,3.2vw,30px)] font-bold tracking-tight">
              {copy.home.downloadTitle}
            </h2>
            <p className="mx-auto mt-sm mb-lg max-w-[58ch] text-[17px] opacity-85">
              {copy.home.downloadBody}
            </p>

            <div className="flex flex-wrap justify-center gap-sm">
              {/* Store links are placeholders until the app ships — pointed at
                  the contact page rather than a dead store URL, because a
                  broken store link on the landing page reads as an abandoned
                  product. */}
              <Link
                href="/contact"
                className="touch inline-flex items-center justify-center rounded-md bg-surface-container-lowest px-lg text-[15px] font-semibold text-on-surface no-underline transition-opacity hover:opacity-90"
              >
                <span className="latin">Google Play</span>
              </Link>
              <Link
                href="/contact"
                className="touch inline-flex items-center justify-center rounded-md border border-inverse-on-surface/50 px-lg text-[15px] font-semibold text-inverse-on-surface no-underline transition-colors hover:bg-white/10"
              >
                <span className="latin">App Store</span>
              </Link>
            </div>
          </div>
        </div>
      </Section>
    </main>
  );
}
