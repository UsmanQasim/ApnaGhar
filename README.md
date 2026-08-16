# Ghar

Ghar is a property marketplace platform for Pakistan with a mobile-first experience, a public landing/web presence, an admin console, and a shared backend API. The project is organized as a pnpm monorepo with Next.js apps, a React Native/Expo app, and a NestJS API.

## Overview

- Mobile app for buyers and agents
- Public marketing and property web app
- Agent/admin dashboard in Next.js
- Shared property, pricing, and i18n packages
- NestJS backend with Prisma and PostgreSQL

## Repository structure

- apps/mobile — Expo + React Native app
- apps/web — public marketing / listing web app
- apps/admin — admin dashboard
- apps/share — share links / public listing pages
- apps/api — backend API
- packages/shared — shared business logic and types
- packages/ui — shared UI primitives
- packages/i18n — translation resources

## Prerequisites

- Node.js 20.11+
- pnpm 9+
- Docker Desktop (for local Postgres/Redis if you want to run the API stack)
- Optional: Android Studio / Xcode for native mobile testing

## Install

```bash
pnpm install
```

## Start the stack

### 1) Start database services

```bash
pnpm db:up
```

### 2) Start the backend API

```bash
pnpm --dir apps/api dev
```

### 3) Start the apps

```bash
pnpm --dir apps/web dev
pnpm --dir apps/admin dev
pnpm --dir apps/share dev
pnpm --dir apps/mobile dev
```

## Common run commands

From the repository root:

```bash
pnpm install
pnpm dev
pnpm build
pnpm typecheck
pnpm test
pnpm lint
```

## Port map

- Admin: http://localhost:3001
- Share: http://localhost:3002
- Web: http://localhost:3003
- Expo: Metro bundler on the default Expo port
- API: likely local Nest dev server (check app output)

## Environment variables

Create local environment files from examples if they exist. Keep secrets out of Git and never commit real credentials.

```bash
cp .env.example .env
```

## Database workflow

```bash
pnpm db:migrate
pnpm db:seed
pnpm db:down
```

## Notes

- The repository uses pnpm workspaces.
- Expo, Next.js, and API builds generate local caches and build artifacts that should stay ignored by Git.
- The project is designed for a Pakistani property marketplace with Urdu-first UX and a payments-driven agent model.

## Contribution

Before opening a pull request:

1. Run the type checks.
2. Verify the app starts in dev mode.
3. Avoid committing secrets, generated build output, or local editor files.
  type[subscription|listing_fee|premium|boost|credit|adjustment],
  reference_id, description_ur, description_en, amount_paisa, created_at

payments
  id, agent_id, invoice_id nullable, amount_paisa,
  provider[manual_easypaisa|manual_jazzcash|jazzcash_api|easypaisa_api|card],
  provider_txn_id, payer_msisdn,
  status[pending|verified|failed|refunded],
  proof_url nullable,          -- manual: screenshot
  verified_by nullable, verified_at, raw_payload jsonb, created_at

ledger_entries               -- append-only, the source of truth for balance
  id, agent_id, direction[debit|credit], amount_paisa,
  source[invoice_item|payment|refund|credit], source_id,
  balance_after_paisa, created_at

boosts
  id, property_id, type[top_search|featured_home], starts_at, ends_at,
  price_paisa, invoice_item_id

saved_searches
  id, user_id, name, filters jsonb, notify bool, last_notified_at

notifications
  id, user_id, type, payload jsonb, read_at, created_at

admin_audit_log
  id, admin_id, action, entity, entity_id, before jsonb, after jsonb, created_at
```

### Listing lifecycle

```
draft ──publish──> [quota check]
                      │
        within quota ─┴─> active
        over quota   ───> pending_payment ──pay/defer──> active
active ──mark sold──> sold      (frees a quota slot)
active ──mark rented──> rented  (frees a quota slot)
active ──agent archives──> archived
any    ──subscription restricted──> hidden (status kept, `is_visible=false`)
```

---

## 6. Privacy & sharing

Three visibility levels on every property:

| Level | Visible to |
|---|---|
| `public` | Everyone — feed, search, agent profile |
| `hidden_from_agents` | Customers and the owning agent only. Other agent accounts get 404. |
| `private` | Owning agent only. Reachable **exclusively** through a share link. |

### Share links

`GET /s/:token` — opens a lightweight web page (no app install needed; this is how the agent sends it on WhatsApp).

- `expires_at` — agent picks **30 min / 2 hours / 24 hours / 7 days / never**
- `max_views` — optional cap (e.g. "viewable once")
- Revocable instantly from the agent's dashboard
- Every open is logged to `share_link_views` → the agent sees *"Ali viewed this 3 times"*
- Optional: bind the link to a phone number with an OTP gate for genuinely confidential listings
- Expired link renders a polite Urdu page + "Contact agent" button — never a raw 404

**Enforcement must be server-side.** The visibility check belongs in a Nest guard on the listing resolver, not in the app. Media URLs for private listings must be short-lived signed URLs, otherwise the video leaks even when the listing does not.

---

## 7. Urdu-first, low-literacy UX

This is a feature, not a translation task. Design rules:

- **Urdu is the default.** English is the toggle, not the other way round.
- Font: **Noto Nastaliq Urdu** bundled (do not rely on device fonts — Android renders Urdu inconsistently). Line height ≈ 2× Latin.
- Full **RTL layout** via `I18nManager.forceRTL` — mirrored icons, back arrows, sliders, carousels.
- **Icon + photo first, text second.** Every category, every filter, every action has a picture.
- **Tap targets ≥ 48dp**, max 5 items in the bottom nav.
- **Voice search** (`ur-PK` speech-to-text) — a big mic button is the primary search affordance, the text field is secondary.
- **Voice description** — the agent records the description by speaking; transcribe server-side, let him confirm.
- **Read-aloud** — TTS button on every listing reads price, location, size, description.
- **Prices in local units**: `85 لاکھ`, `1.2 کروڑ` — never `8500000`.
- **Area in marla/kanal** by default, sqft secondary.
- **Numerals**: Urdu-Indic digits (۱۲۳) in Urdu mode, with a user preference to switch to Latin.
- **Confirmations are pictorial** — "Mark as sold?" shows the property photo with a big green tick / red cross.
- **Onboarding**: a 60-second Urdu video, skippable, replayable from settings.
- **Errors are spoken plainly**: "انٹرنیٹ نہیں چل رہا" not "Network request failed (503)".

Copy lives in `locales/ur.json` + `locales/en.json`. Nothing hardcoded, ever. Every string key needs an Urdu value before merge — CI should fail on a missing key.

---

## 8. Payments

Two rails, both live, behind one interface. Manual carries you from day one; the wallet APIs come online as merchant onboarding completes (JazzCash quotes roughly **5–7 working days** for technical integration once you have credentials, but company registration and merchant approval take longer).

```ts
interface PaymentProvider {
  code: ProviderCode;
  initiate(input: InitiateInput): Promise<InitiateResult>;   // returns redirect URL | instructions
  verify(ref: string): Promise<PaymentStatus>;               // polling / reconciliation
  handleWebhook(req: RawRequest): Promise<PaymentEvent>;     // provider callback
}
```

### Rail A — Manual wallet transfer (Phase 1, ship first)

1. App shows your EasyPaisa **and** JazzCash merchant numbers with a one-tap copy, plus a QR.
2. Agent transfers, then uploads a screenshot and types the TxID + the number he paid from.
3. Row created in `payments` with `status = pending`, listing/subscription unblocked **optimistically** for up to 24 hours (so nobody is stuck waiting on you at 11pm).
4. Admin panel verification queue: approve / reject with a reason. Approval writes a `ledger_entry` and settles the invoice.
5. Rejection → SMS + push in Urdu explaining why, access reverts to `past_due`.

Cost to build: near zero. Cost to run: your time. At 100–300 agents this is completely manageable and it lets you launch **without waiting on merchant onboarding**.

### Rail B — Direct JazzCash + Easypaisa merchant APIs

- JazzCash issues `Merchant_ID`, `Password`, `Integrity Salt / hash key`, and sandbox + production URLs on merchant registration.
- Requests are signed with an HMAC-SHA256 hash built from the sorted parameter string + integrity salt. **Hash generation is server-side only** — never in the app, never in a webview.
- Flow: server builds params → app opens hosted checkout / wallet redirect → provider calls your `return_url` and webhook → you verify the response hash → then mark paid.
- Idempotency: `provider_txn_id` is unique. Reconcile nightly against the merchant portal — never trust the redirect alone.
- Easypaisa follows the same shape with its own credential set.

### Rail C — Aggregator (optional fallback)

If direct merchant onboarding stalls, a PSP/aggregator (Safepay, PayFast, PayPro, Simpaisa) gives you EasyPaisa + JazzCash + cards under one merchant relationship and one API. Trade-off is MDR: published rates vary, and smaller merchants without negotiating leverage typically land at ~2.5–3%. On a Rs 100 ticket that is Rs 2.50–3 — acceptable, but the fixed per-transaction component is what will hurt, so check it before committing.

> **Reality check on Rs 100 tickets:** any percentage-based fee is fine, but a fixed fee of Rs 5–15 per transaction destroys the margin. Two mitigations, both worth building: (a) offer **3-month (Rs 270) and 12-month (Rs 1,000) prepay** options — fewer transactions, better cash flow, better retention; (b) let listing fees **accrue to a single month-end invoice** so one agent pays once per month, not eight times.

---

## 9. Premium — making Rs 1,000/month obviously worth it

| Feature | Detail |
|---|---|
| **Unlimited listings** | Cheaper than basic from 21 listings up; everything below is free on top |
| **Top-of-search placement** | 2 "تجویز کردہ" (Suggested) slots at the top of matching searches, clearly labelled as promoted |
| **Featured in home feed** | Rotating premium carousel |
| **3 boosts / month** | 72-hour top placement on a chosen listing |
| **Demand insights** | Which localities are being searched most, price bands buyers filter for, supply-vs-demand gap in his areas |
| **Listing analytics** | Views, watch-through rate on video, saves, share-link opens, drop-off point — per listing, over time |
| **Lead alerts** | Push when demand spikes in his service areas, or when a buyer saves a comparable property nearby |
| **Verified badge + agency page** | Public profile with all listings, rating, contact — shareable as one link |
| **Auto flyer** | One-tap branded WhatsApp/Facebook image + caption generated from the listing |
| **Bulk tools** | CSV import, bulk price update, bulk republish |
| **Extended sharing** | Unlimited share links, custom branding on the shared page, view analytics per recipient |
| **Priority Urdu support** | WhatsApp support line, response SLA |

### ⚠️ On "early info about the customer viewing property near his domain"

Do not expose individual customer identity, phone number, or browsing history to agents. It will destroy customer trust the first time someone gets a cold call, and it sits badly against Pakistan's PECA 2016 and the draft Personal Data Protection Bill.

Build it as **aggregate demand signal** instead:

- ✅ *"12 buyers searched for 5-marla houses in Johar Town this week — up 40%"*
- ✅ *"3 people saved a property similar to yours in the last 24 hours"*
- ✅ Identity revealed **only** when the customer taps "Contact agent" / "Request a call" — an explicit, consented handover
- ❌ Never: *"Ahmed (03xx-xxxxxxx) viewed your property"*

The aggregate version is genuinely useful to agents, and it is the version you can defend publicly.

---

## 10. Agent dashboard

Landing screen after login, glanceable, Urdu labels:

- **This month**: listings posted · views · leads · sold/rented · revenue earned (agent's own sale value, self-reported at mark-sold)
- **Billing card**: current plan, quota used (`4 / 3 used — Rs 50 due`), next invoice date, amount due, one-tap Pay
- **My listings**: tabs — Active · Pending payment · Sold · Rented · Draft · Hidden
- **Performance**: 6-month bar chart of listings vs sales; best-performing listing
- **Recent activity**: comments awaiting reply, share links opened, new likes
- **Premium teaser** (basic plan only): "You'd have saved Rs X this month on Premium" — computed from actual usage, only shown when true

Monthly revenue is agent-reported at mark-sold (optional field: sale price + commission %). Keep it optional — many agents will not want to enter it — and never expose it publicly.

---

## 11. Search & discovery

- **Filters**: purpose (sale/rent), type, city → locality, price range, area range, bedrooms, bathrooms, furnished, has video, verified agent only, newest/cheapest/nearest
- **Geo**: `ST_DWithin` radius from a map pin or device GPS; "near me" as a one-tap chip
- **Text**: Postgres `tsvector` over title + description, in both languages; Urdu needs a custom dictionary + transliteration handling (`johar town` / `جوہر ٹاؤن` must both match)
- **Ranking**: relevance × recency × engagement, with promoted slots inserted at fixed labelled positions — never silently mixed into organic results
- **Saved searches** with push alerts on new matches (a strong retention hook for customers)
- **Price on request** listings are searchable but excluded from price-range filters; show `قیمت: رابطہ کریں`

---

## 12. Repository layout

```
ghar/
├── apps/
│   ├── mobile/          # Expo (React Native) — agent + customer
│   ├── api/             # NestJS
│   ├── admin/           # Next.js admin panel
│   └── share/           # Next.js public share-link pages (SEO + no-install viewing)
├── packages/
│   ├── shared/          # types, zod schemas, money utils, enums
│   ├── i18n/            # ur.json / en.json, formatters (لاکھ/کروڑ, marla/kanal)
│   └── ui/              # shared design tokens
├── infra/
│   ├── docker-compose.yml
│   └── migrations/
└── docs/
    ├── pricing.md
    ├── api.md
    └── design/          # Google Stitch exports
```

Monorepo via pnpm workspaces + Turborepo.

---

## 12a. Build status

| Area | State |
|---|---|
| `packages/shared` — money, pricing engine, quota, visibility rules | ✅ built + tested |
| `packages/i18n` — Urdu formatters, 216 keys, CI parity + usage gates | ✅ built + tested |
| `packages/ui` — design tokens from the Stitch system, a11y-asserted | ✅ built + tested |
| `apps/api` — schema, migrations, auth, listings, search, billing, payments, share | ✅ built |
| `apps/mobile` — RTL bootstrap, fonts, feed, full 8-step wizard, dashboard, auth, uploader | ✅ built |
| `apps/mobile` — search + results + filters, property detail, agent profile, my-listings | ✅ built |
| `apps/mobile` — payment method / history / invoice, premium upgrade, insights, reports | ✅ built |
| `apps/share` — public no-install share page | ✅ built |
| `apps/admin` — payment verification queue | ✅ built |
| `apps/admin` — overview, agent management, listing moderation, platform reports | ✅ built |
| `apps/web` — marketing home, buyers, agents, pricing, contact | ✅ built |
| Voice search UI — built and reachable; **no speech-to-text engine wired yet** | ⚠️ see below |
| Moderation queue, fraud detection, observability, backups | ⬜ not started |
| Media pipeline — R2 presigned uploads, Cloudflare Stream, signed private playback | ✅ built |

**66 unit tests** cover the pricing model, visibility/share-link rules, Urdu
formatting, the JazzCash secure hash and the Cloudflare Stream webhook
signature (both including tampered-payload replays), and the design tokens'
contrast, touch-target and chart-colour floors.

**⚠️ Voice search is UI-only.** `expo-speech` is text-to-SPEECH; there is no
speech-to-text dependency in the app. Every mic button is built, reachable and
wired to `src/search/useVoiceSearch.ts`, which is the single integration point
— implement `start()` against a recogniser and all of them work at once. Until
then it reports itself unavailable rather than doing nothing silently. Wiring
it needs a native rebuild, not an OTA update.

**⚠️ `pnpm install` is required before the next build.** `apps/mobile` gained
`expo-image-picker` and `expo-clipboard` (the photo step and the payment-proof
step both needed a real picker; there was none), and `apps/web` is a new
workspace package.

**11 integration tests** (`apps/api/test/`) run against a real PostGIS instance
in CI. They cover what a mocked Prisma client structurally cannot: the
double-tapped Publish, two genuinely concurrent publishes racing on the same
listing, quota freed by marking sold, the append-only ledger trigger, and cycle
close. Every case there is a way an agent could be double-charged — bugs that
don't throw, they just produce a wrong invoice.

Two things are asserted by tests rather than left to review, because both are
silent failures rather than crashes:

- **`premiumBreakEvenListings()` must return a finite number.** If premium ever
  gets a listing cap again, basic becomes cheaper at every count, the break-even
  vanishes, and the app would go on telling agents something untrue. The test
  fails instead.
- **The price pill must differ from the primary button in *luminance*, not just
  hue.** See `docs/design/README.md` §2.
- **The two chart series must stay apart under deuteranopia, protanopia and
  tritanopia**, measured as OKLab ΔE on a simulated dichromat view. They are
  told apart by hue and chroma, NOT brightness (1.44:1), which is why every
  chart using both also carries a legend and direct labels. The test says so,
  so nobody removes the labels "because the colours are clear".

## 13. Getting started

```bash
pnpm install
cp .env.example .env
docker compose -f infra/docker-compose.yml up -d   # postgres + postgis + redis
pnpm --filter api prisma migrate dev
pnpm --filter api seed          # plans, cities, localities, demo agent
pnpm dev                        # api + mobile + admin
```

### Environment

```
DATABASE_URL=
REDIS_URL=
JWT_SECRET=
JWT_REFRESH_SECRET=

SMS_PROVIDER=            # local aggregator
SMS_API_KEY=
SMS_SENDER_ID=

R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
CF_STREAM_TOKEN=

PAYMENTS_MANUAL_ENABLED=true
MANUAL_EASYPAISA_NUMBER=
MANUAL_JAZZCASH_NUMBER=

JAZZCASH_ENABLED=false
JAZZCASH_MERCHANT_ID=
JAZZCASH_PASSWORD=
JAZZCASH_INTEGRITY_SALT=
JAZZCASH_RETURN_URL=

EASYPAISA_ENABLED=false
EASYPAISA_STORE_ID=
EASYPAISA_HASH_KEY=
```

---

## 14. Roadmap

### M0 — Foundations (weeks 1–3)
Monorepo, schema + migrations, phone OTP auth, Urdu/English i18n skeleton with RTL working end to end, design tokens.

### M1 — Core marketplace (weeks 4–8)
Listing CRUD, image upload, search + filters + geo, customer browse/detail, agent profile, mark sold/rented. **No payments yet — seed with real listings from friendly agents.**

### M2 — Money (weeks 9–12)
Plans, subscriptions, quota enforcement, invoices, ledger, manual EasyPaisa/JazzCash flow, admin verification queue, dunning + restriction states. **Launch here.**

### M3 — Video & social (weeks 13–16)
Video upload + transcode, reel feed, likes, comments, agent replies, moderation. Push notifications.

### M4 — Privacy & sharing (weeks 17–19)
Private/hidden listings, timed share links, share web pages, view tracking.

### M5 — Premium (weeks 20–24)
Insights rollups, boosts, top placement, verified badge, auto flyer, bulk tools, agency pages.

### M6 — Scale
JazzCash/Easypaisa direct API, prepay plans, saved-search alerts, self-hosted video, referral program.

---

## 15. Risks worth naming now

| Risk | Mitigation |
|---|---|
| **Chicken-and-egg** — agents won't pay for an empty app; customers won't come to an empty app | Launch in **one city, one or two localities**. Onboard 30–50 agents free for 3 months. Charge only once they see leads. |
| **Fake/duplicate listings** | CNIC verification for agents, duplicate detection on image hash + address, customer reporting, admin moderation |
| **Rs 100 is below transaction-fee viability** | Prepay bundles (3mo/12mo), month-end invoice batching, manual rail as the low-cost default |
| **Video bandwidth cost** | Hard cap 90s / 100MB per video, aggressive ABR, thumbnail-first feed with tap-to-play, lazy loading |
| **Agents gaming the free quota** with throwaway accounts | One account per verified CNIC + phone; device fingerprinting |
| **Urdu rendering breaks on cheap Android** | Bundle the font, test on a real Rs 20k device from day one, not just an emulator |
| **Privacy backlash on premium "buyer insights"** | Aggregate-only, consented handover (see §9) |

---

## 16. Design

UI designs will be produced in **Google Stitch** and exported to `docs/design/`. When the Stitch MCP is connected, screens can be pulled directly and translated into React Native components against the tokens in `packages/ui`.

Priority screens: onboarding (Urdu video), home feed, search + filters, listing detail, agent listing-create wizard, payment screen, agent dashboard, share-link page.

---

## 17. Open questions

1. Which city first? (Recommendation: whichever one you have real agent relationships in — that beats market size at this stage.)
2. Is CNIC verification mandatory at signup, or only for the verified badge? Mandatory raises trust but hurts conversion.
3. Do customers need accounts to browse, or only to comment/save? (Recommendation: browsing anonymous, account only on interaction.)
4. Commission model later — do you ever want a cut of the sale, or stay purely subscription?
5. Should agents be able to see each other's public listings at all? Some agents will treat that as a reason not to join.

---

**Sources for the payments section:**
[JazzCash merchant API setup guide](https://www.simpaisa.com/blogs/how-to-accept-jazzcash-payments-on-your-website-step-by-step-2026/) ·
[JazzCash PHP integration library](https://github.com/zfhassaan/jazzcash) ·
[JazzCash API integration service overview](https://apidevx.com/jazzcash-api-integration-service-in-pakistan/) ·
[Easypaisa website integration guide](https://www.simpaisa.com/blogs/how-to-add-easypaisa-payments-to-your-website-2026-complete-guide/) ·
[Best payment gateways in Pakistan 2026](https://rapidgateway.pk/resources/best-payment-gateway-pakistan) ·
[PayFast Pakistan review — fees](https://rapidgateway.pk/resources/payfast-pakistan-review)
