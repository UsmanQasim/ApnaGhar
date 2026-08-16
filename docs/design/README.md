# Design notes — Stitch exports

25 screens exported from Google Stitch, each as `code.html` + `screen.png`.
`ghar/DESIGN.md` holds the design system.

The exports are the **visual reference**. The tokens in `packages/ui/src/tokens.ts`
are the **implementation source of truth** — build components from those, not by
eyeballing hex values out of `code.html`.

---

## Conflicts found in the exports, and how they were resolved

### 1. DESIGN.md contradicts itself on the palette

Its prose says the primary is `#059669` and the background `#F8FAFC`. Its own
frontmatter token block says `#006948` and `#f8f9ff`.

**Resolved:** the frontmatter wins. `#006948` appears 33 times across the
exported HTML; `#059669` appears nowhere. The prose was written against an
earlier palette.

### 2. ⚠️ The amber price pill is invisible to colourblind users

`tertiary` (`#825100`) and `primary` (`#006948`) have a contrast ratio of
**1.00:1** — effectively identical relative luminance. They are told apart by
hue alone, and green-vs-amber is exactly the axis that red-green colour
blindness collapses (~8% of men).

DESIGN.md's stated intent is *"Tertiary reserved for verified badges and price
tags to ensure they stand out against the green."* On luminance, it does not.
To a deuteranope the price pill and the primary button are the same colour.

**Resolved:** `packages/ui` exposes semantic `roles` rather than raw tokens.
The price pill uses `tertiaryFixedDim` (`#ffb95f`) with `onTertiaryFixed`
(`#2a1700`) — same amber identity, 10.1:1 text contrast, and ~4:1 luminance
separation from primary green. Both values were already in the design system;
this only picks the right pair. Asserted in `packages/ui/src/tokens.test.ts`.

### 3. The dashboard's premium card is out of date

`agent_dashboard/screen.png` advertises Premium as **"۲۰ لسٹنگز"** (20 listings).

The pricing model changed after these screens were generated: a capped Premium
makes basic cheaper at *every* listing count, so the break-even the pitch
depends on never happens. Premium is now **unlimited listings**, and the
crossover is real at 21. See README §2.

**Resolved:** the card must render from `PLANS` in `@ghar/shared`, never from a
hardcoded number, so the UI cannot drift from billing again. The Urdu string is
`premium.unlimitedListings` ("لامحدود اشتہار").

### 4. Bottom navigation is ordered left-to-right inside an RTL layout

In `video_feed/screen.png` and `agent_dashboard/screen.png` the nav reads
ہوم → تلاش → (mic) → میری لسٹنگز → پروفائل from the **left**. In an RTL layout
the primary destination belongs on the **right**, where the thumb and the
reading order both start.

**Resolved:** implement the nav in logical order and let RTL layout flip it.
`ہوم` ends up rightmost. This is a deliberate divergence from the mock.

### 5. Text overlay artifact in `video_feed`

English hashtag text bleeds through behind the Urdu caption. This is a Stitch
rendering artifact, not a design intent — ignore it.


### 6. The pricing screen shows a pricing model that does not exist

`pricing/screen.png` advertises **three** tiers — Free **Rs 0**, Standard
**Rs 5,000**, Premium **Rs 15,000** — with 5- and 20-listing caps.

None of those numbers are the product's. The real model (README §2) is Basic
**Rs 100/month** with 3 included listings and **Rs 50** per extra listing, and
Premium **Rs 1,000/month** unlimited. This is the same staleness as §3: the
mock predates the pricing decision.

**Resolved:** `apps/web/app/pricing/page.tsx` renders every figure from `PLANS`
and `EXTRA_LISTING_FEE_PAISA` in `@ghar/shared`, and the break-even line from
`premiumBreakEvenListings()`. A public price page quoting Rs 5,000 while the
billing engine invoices Rs 100 is not a design inconsistency, it is a
consumer-protection problem — so this one can never be hardcoded.

### 7. Two marketing screens promise things the product does not do

`for_buyers` claims **"ہماری ٹیم ہر پراپرٹی کی فزیکل اور ڈاکومنٹری تصدیق کرتی
ہے"** (physical and documentary inspection of every property) and **"ہمارے
قانونی ماہرین خریداری کے پورے عمل میں رہنمائی کرتے ہیں"** (in-house legal
guidance). Neither exists: agents are verified, individual properties are not,
and there is no legal service.

`for_agents` leads with **"اپنی سیلز میں 3 گنا اضافہ کریں"** — a 3x sales
claim nothing in the product measures.

`marketing_home` shows a **10K+ / 5K+ / 1M+** stats band. The product launches
in one city with 30–50 onboarded agents (README §15).

**Resolved:** all four are omitted from the built pages. What replaces the
buyer-trust claims is one the product does keep — a buyer's number reaches an
agent only when the buyer makes contact (`EngagementService.createLead`). The
stats band is left out until the numbers are real; the layout has room for it.

### 8. `listings_management` and `reports_analytics` are ADMIN screens

Both exports carry the admin sidebar (`ایڈمن پینل` / `گھر مارکیٹ پلیس`), not the
app's bottom navigation. The screen-inventory table below originally filed
`listings_management` under "App (agent)"; it is the admin's listing moderation
table, and `reports_analytics` is the admin's platform report.

**Resolved:** both built in `apps/admin`. The agent-facing equivalents are
separate screens with different scopes — `apps/mobile/app/listings/` (his own
listings, including drafts) and `apps/mobile/app/reports/` (his own
performance, never another agent's numbers).

---

## What the exports get right, and must be preserved

- **`dir="rtl"` on 24 of 25 screens.** Urdu-first is honoured throughout.
- **Nastaliq line heights of ~2x.** Not padding — without it, descenders of one
  line collide with ascenders of the next. Enforced by a test in `packages/ui`.
- **Split typography.** Nastaliq for prose, Plus Jakarta Sans for numerals, so
  `1.2 کروڑ` renders the digits scannably and the unit naturally.
- **48px touch targets** on every interactive element.
- **Tonal layers over shadows** — cards are white with a 1px border; shadows are
  reserved for the two FABs (voice search, call agent).
- **Icon + photo first, text second** on every navigation and category control.

## Screen inventory

| Screen | Surface | Milestone |
|---|---|---|
| `marketing_home`, `for_buyers`, `for_agents`, `pricing`, `contact_us` | Web (`apps/web`) | M6 |
| `video_feed`, `search`, `search_results`, `property_detail` | App (customer) | M1/M3 |
| `agent_dashboard`, `agent_profile` | App | M1 |
| `listings_management` | **Admin** (see §8) | M2 |
| `new_listing_details`, `new_listing_media`, `new_listing_final_step` | App (agent) | M1 |
| `payment_method`, `payment_history`, `invoice_details` | App (agent) | M2 |
| `premium_insights` | App (agent) | M5 |
| `reports_analytics` | **Admin** (see §8) | M5 |
| `public_share_link` | Web (no install) | M4 |
| `admin_dashboard`, `agent_management`, `payment_verification` | Admin | M2 |
