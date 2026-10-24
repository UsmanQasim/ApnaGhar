import { createHash } from 'node:crypto';

import { PrismaClient } from '@prisma/client';

import { EXTRA_LISTING_FEE_PAISA, Locale, PLANS, PlanCode } from '@ghar/shared';

/**
 * DEMO DATA — throwaway.
 *
 * Fills the database with enough agents, listings, invoices and payments to
 * exercise every screen in the admin panel: the payment queue with a real
 * amount mismatch, the agent table with verified / unverified / suspended
 * rows, the listings table across every status, and six months of revenue so
 * the reports charts have a shape.
 *
 * ── How to remove it ────────────────────────────────────────────────────────
 *
 *     pnpm --filter @ghar/api demo:clean
 *
 * ── Before the first run ────────────────────────────────────────────────────
 *
 * The database needs migration 0003_locale_roman_urdu, and the generated
 * Prisma client needs to be newer than it — a client generated before that
 * migration still types `users.locale` as an enum with no "ur-Latn" member,
 * and this file fails to compile against it. `scripts\deploy-db.ps1` does
 * both, in that order.
 *
 * Every row this script writes is tagged so that removal is exact rather than
 * "delete anything that looks fake":
 *
 *   • users get a phone in the +92 300 9900 0xx block, which is reserved here
 *     and used nowhere else
 *   • invoices get a DEMO- number prefix
 *
 * The cleanup deletes the demo users; everything else — agents, properties,
 * invoices, payments, leads, views — is removed by the schema's own
 * `onDelete: Cascade`, so nothing is left orphaned and no real row is touched.
 *
 * Re-running is safe. Users are upserted by phone and the per-agent rows are
 * cleared first, so this converges rather than accumulating.
 */

const prisma = new PrismaClient();

/** The reserved block. Nothing outside this script may use these numbers. */
const DEMO_PHONE_PREFIX = '+9230099000';
const DEMO_INVOICE_PREFIX = 'DEMO-';

const now = new Date();
const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000);
const minutesFromNow = (n: number) => new Date(now.getTime() + n * 60_000);

/** Rs → paisa. Money is integer paisa everywhere; never floats. */
const rs = (rupees: number) => BigInt(Math.round(rupees * 100));

interface DemoAgent {
  slot: number;
  name: string;
  agencyName: string | null;
  city: string;
  isVerified: boolean;
  suspended: boolean;
  plan: PlanCode;
  ratingAvg: number | null;
  ratingCount: number;
}

const AGENTS: DemoAgent[] = [
  { slot: 1, name: 'علی خان', agencyName: 'Khan Estate', city: 'Lahore', isVerified: true, suspended: false, plan: PlanCode.PREMIUM, ratingAvg: 4.6, ratingCount: 38 },
  { slot: 2, name: 'Usman Qasim', agencyName: null, city: 'Islamabad', isVerified: false, suspended: false, plan: PlanCode.BASIC, ratingAvg: null, ratingCount: 0 },
  { slot: 3, name: 'فہد ملک', agencyName: 'Malik Properties', city: 'Lahore', isVerified: true, suspended: true, plan: PlanCode.PREMIUM, ratingAvg: 4.9, ratingCount: 112 },
  { slot: 4, name: 'Sana Iqbal', agencyName: 'Bahria Homes', city: 'Islamabad', isVerified: true, suspended: false, plan: PlanCode.BASIC, ratingAvg: 4.2, ratingCount: 17 },
  { slot: 5, name: 'بلال احمد', agencyName: null, city: 'Karachi', isVerified: false, suspended: false, plan: PlanCode.BASIC, ratingAvg: 3.8, ratingCount: 6 },
  { slot: 6, name: 'Hira Sheikh', agencyName: 'Clifton Realty', city: 'Karachi', isVerified: true, suspended: false, plan: PlanCode.PREMIUM, ratingAvg: 4.7, ratingCount: 54 },
  { slot: 7, name: 'عمر فاروق', agencyName: 'Pindi Estates', city: 'Rawalpindi', isVerified: false, suspended: false, plan: PlanCode.BASIC, ratingAvg: null, ratingCount: 0 },
  { slot: 8, name: 'Zainab Raza', agencyName: 'Madina Property', city: 'Faisalabad', isVerified: true, suspended: false, plan: PlanCode.BASIC, ratingAvg: 4.4, ratingCount: 21 },
];

type Status = 'draft' | 'pending_payment' | 'active' | 'sold' | 'rented' | 'expired' | 'archived';

interface DemoListing {
  titleUr: string;
  city: string;
  locality: string;
  purpose: 'sale' | 'rent';
  type: 'house' | 'flat' | 'plot' | 'shop' | 'office' | 'warehouse';
  priceRs: number | null;
  areaValue: number;
  areaUnit: 'marla' | 'kanal' | 'sqft' | 'sqyd';
  bedrooms: number | null;
  bathrooms: number | null;
  status: Status;
  views: number;
  agentSlot: number;
}

const LISTINGS: DemoListing[] = [
  { titleUr: 'جوہر ٹاؤن میں 5 مرلہ خوبصورت گھر', city: 'Lahore', locality: 'Johar Town', purpose: 'sale', type: 'house', priceRs: 8_500_000, areaValue: 5, areaUnit: 'marla', bedrooms: 3, bathrooms: 3, status: 'active', views: 1_284, agentSlot: 1 },
  { titleUr: 'ڈی ایچ اے فیز 6 میں 1 کنال کوٹھی', city: 'Lahore', locality: 'DHA', purpose: 'sale', type: 'house', priceRs: 42_000_000, areaValue: 1, areaUnit: 'kanal', bedrooms: 6, bathrooms: 6, status: 'active', views: 892, agentSlot: 1 },
  { titleUr: 'گلبرگ میں 2 بیڈ اپارٹمنٹ، کرائے پر', city: 'Lahore', locality: 'Gulberg', purpose: 'rent', type: 'flat', priceRs: 85_000, areaValue: 1_400, areaUnit: 'sqft', bedrooms: 2, bathrooms: 2, status: 'rented', views: 431, agentSlot: 1 },
  { titleUr: 'ماڈل ٹاؤن میں کمرشل دکان', city: 'Lahore', locality: 'Model Town', purpose: 'rent', type: 'shop', priceRs: 120_000, areaValue: 400, areaUnit: 'sqft', bedrooms: null, bathrooms: 1, status: 'active', views: 267, agentSlot: 3 },
  { titleUr: 'بحریہ ٹاؤن میں 10 مرلہ پلاٹ', city: 'Lahore', locality: 'Bahria Town', purpose: 'sale', type: 'plot', priceRs: 12_500_000, areaValue: 10, areaUnit: 'marla', bedrooms: null, bathrooms: null, status: 'sold', views: 1_907, agentSlot: 3 },
  { titleUr: 'ایف ۱۱ میں فیملی اپارٹمنٹ', city: 'Islamabad', locality: 'F-11', purpose: 'sale', type: 'flat', priceRs: 22_000_000, areaValue: 1_850, areaUnit: 'sqft', bedrooms: 3, bathrooms: 3, status: 'active', views: 654, agentSlot: 2 },
  { titleUr: 'بحریہ انکلیو میں 8 مرلہ گھر', city: 'Islamabad', locality: 'Bahria Enclave', purpose: 'sale', type: 'house', priceRs: 19_500_000, areaValue: 8, areaUnit: 'marla', bedrooms: 4, bathrooms: 4, status: 'pending_payment', views: 88, agentSlot: 2 },
  { titleUr: 'جی ۱۳ میں دفتر برائے کرایہ', city: 'Islamabad', locality: 'G-13', purpose: 'rent', type: 'office', priceRs: 95_000, areaValue: 900, areaUnit: 'sqft', bedrooms: null, bathrooms: 2, status: 'active', views: 342, agentSlot: 4 },
  { titleUr: 'ایف ۱۱ میں 1 کنال کوٹھی (قیمت: رابطہ کریں)', city: 'Islamabad', locality: 'F-11', purpose: 'sale', type: 'house', priceRs: null, areaValue: 1, areaUnit: 'kanal', bedrooms: 5, bathrooms: 5, status: 'active', views: 1_120, agentSlot: 4 },
  { titleUr: 'کلفٹن میں سی ویو اپارٹمنٹ', city: 'Karachi', locality: 'Clifton', purpose: 'sale', type: 'flat', priceRs: 35_000_000, areaValue: 2_200, areaUnit: 'sqft', bedrooms: 3, bathrooms: 4, status: 'active', views: 2_043, agentSlot: 6 },
  { titleUr: 'گلشنِ اقبال میں 240 گز مکان', city: 'Karachi', locality: 'Gulshan-e-Iqbal', purpose: 'sale', type: 'house', priceRs: 28_000_000, areaValue: 240, areaUnit: 'sqyd', bedrooms: 5, bathrooms: 4, status: 'active', views: 776, agentSlot: 6 },
  { titleUr: 'ڈی ایچ اے کراچی میں گودام', city: 'Karachi', locality: 'DHA', purpose: 'rent', type: 'warehouse', priceRs: 350_000, areaValue: 5_000, areaUnit: 'sqft', bedrooms: null, bathrooms: 1, status: 'archived', views: 54, agentSlot: 5 },
  { titleUr: 'نارتھ ناظم آباد میں 120 گز گھر', city: 'Karachi', locality: 'North Nazimabad', purpose: 'sale', type: 'house', priceRs: 14_000_000, areaValue: 120, areaUnit: 'sqyd', bedrooms: 3, bathrooms: 2, status: 'draft', views: 0, agentSlot: 5 },
  { titleUr: 'سیٹلائٹ ٹاؤن میں 7 مرلہ گھر', city: 'Rawalpindi', locality: 'Satellite Town', purpose: 'sale', type: 'house', priceRs: 16_800_000, areaValue: 7, areaUnit: 'marla', bedrooms: 4, bathrooms: 3, status: 'active', views: 508, agentSlot: 7 },
  { titleUr: 'مدینہ ٹاؤن میں 5 مرلہ گھر', city: 'Faisalabad', locality: 'Madina Town', purpose: 'sale', type: 'house', priceRs: 9_200_000, areaValue: 5, areaUnit: 'marla', bedrooms: 3, bathrooms: 3, status: 'active', views: 611, agentSlot: 8 },
  { titleUr: 'مدینہ ٹاؤن میں دکان، کرائے پر', city: 'Faisalabad', locality: 'Madina Town', purpose: 'rent', type: 'shop', priceRs: 60_000, areaValue: 250, areaUnit: 'sqft', bedrooms: null, bathrooms: 1, status: 'expired', views: 129, agentSlot: 8 },
];

/** Marla and gaz differ by region; this is only for demo rows, so approximate. */
const SQFT: Record<DemoListing['areaUnit'], number> = { marla: 272.25, kanal: 5_445, sqft: 1, sqyd: 9 };

const phoneFor = (slot: number) => `${DEMO_PHONE_PREFIX}${String(slot).padStart(2, '0')}`;

/**
 * Migration 0003 turned `users.locale` from a Postgres enum into a VARCHAR so
 * it could hold "ur-Latn" (enum labels cannot contain a hyphen). This seed
 * writes that value, so it fails in a confusing way — a raw enum-cast error
 * from Postgres, or a TypeScript error from a stale generated client — if the
 * migration has not been applied yet. Check first and say what to run.
 */
async function assertLocaleColumnMigrated(): Promise<void> {
  const rows = await prisma.$queryRaw<Array<{ data_type: string }>>`
    SELECT data_type FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'locale'
  `;

  const FIX =
    'Run scripts\\deploy-db.ps1 — it regenerates the client, applies the ' +
    'migrations and reseeds — then try again.';

  if (rows.length === 0) {
    throw new Error(`No users.locale column: this database has never been migrated.\n${FIX}`);
  }

  if (rows[0]?.data_type !== 'character varying') {
    throw new Error(
      `users.locale is still ${rows[0]?.data_type}, so migration 0003_locale_roman_urdu ` +
        'has not been applied and Roman Urdu ("ur-Latn") cannot be stored.\n' +
        FIX,
    );
  }
}

async function main(): Promise<void> {
  if (process.env['NODE_ENV'] === 'production' && !process.env['DEMO_SEED_ALLOW_PRODUCTION']) {
    throw new Error(
      'Refusing to write demo data with NODE_ENV=production. ' +
        'If this really is intended, set DEMO_SEED_ALLOW_PRODUCTION=1.',
    );
  }

  await assertLocaleColumnMigrated();

  console.log('Seeding demo data…\n');

  // ── Agents ────────────────────────────────────────────────────────────────
  const agentIds = new Map<number, string>();

  for (const spec of AGENTS) {
    const phone = phoneFor(spec.slot);

    const user = await prisma.user.upsert({
      where: { phone },
      update: { name: spec.name, status: spec.suspended ? 'suspended' : 'active' },
      create: {
        phone,
        name: spec.name,
        role: 'agent',
        // `as never` because the generated Prisma client may still be the one
        // from before migration 0003, which typed this column as a Postgres
        // enum that has no "ur-Latn" member — the cast is what lets the seed
        // compile against either client. It is not a licence to write junk:
        // the values come from the shared Locale constants, and
        // assertLocaleColumnMigrated() above refuses to run at all against a
        // database whose column is still that enum.
        locale: (spec.slot % 3 === 0 ? Locale.UR_LATN : Locale.UR) as never,
        status: spec.suspended ? 'suspended' : 'active',
      },
    });

    agentIds.set(spec.slot, user.id);

    await prisma.agent.upsert({
      where: { userId: user.id },
      update: { agencyName: spec.agencyName, isVerified: spec.isVerified, city: spec.city },
      create: {
        userId: user.id,
        agencyName: spec.agencyName,
        city: spec.city,
        isVerified: spec.isVerified,
        cnicVerifiedAt: spec.isVerified ? daysAgo(40) : null,
        // A hash, never a CNIC — the same rule the real flow follows.
        cnicHash: createHash('sha256').update(`demo-cnic-${spec.slot}`).digest('hex'),
        ratingAvg: spec.ratingAvg,
        ratingCount: spec.ratingCount,
        whatsappPhone: phone,
      },
    });

    const periodStart = daysAgo(12);
    await prisma.subscription.upsert({
      where: { agentId: user.id },
      update: { planCode: spec.plan },
      create: {
        agentId: user.id,
        planCode: spec.plan,
        status: spec.suspended ? 'restricted' : 'active',
        currentPeriodStart: periodStart,
        currentPeriodEnd: new Date(periodStart.getTime() + 30 * 86_400_000),
        restrictedAt: spec.suspended ? daysAgo(3) : null,
      },
    });
  }
  console.log(`  ✓ ${AGENTS.length} agents (verified, unverified and one suspended)`);

  // Re-running should converge, not accumulate. Everything below is derived,
  // so it is cleared per demo agent and rebuilt.
  const ids = [...agentIds.values()];
  await prisma.payment.deleteMany({ where: { agentId: { in: ids } } });
  await prisma.invoice.deleteMany({ where: { agentId: { in: ids } } });
  await prisma.property.deleteMany({ where: { agentId: { in: ids } } });

  // ── Listings ──────────────────────────────────────────────────────────────
  const propertyIds: string[] = [];

  for (const listing of LISTINGS) {
    const agentId = agentIds.get(listing.agentSlot);
    if (!agentId) continue;

    const published = listing.status === 'draft' ? null : daysAgo(3 + (listing.views % 60));

    const property = await prisma.property.create({
      data: {
        agentId,
        purpose: listing.purpose,
        type: listing.type,
        titleUr: listing.titleUr,
        descriptionUr:
          'یہ ایک ڈیمو اشتہار ہے، صرف ٹیسٹنگ کے لیے۔ اصل تفصیل ایجنٹ خود لکھتا ہے یا بول کر بتاتا ہے۔',
        pricePaisa: listing.priceRs === null ? null : rs(listing.priceRs),
        priceVisibility: listing.priceRs === null ? 'on_request' : 'public',
        rentPeriod: listing.purpose === 'rent' ? 'month' : null,
        areaValue: listing.areaValue,
        areaUnit: listing.areaUnit,
        areaSqft: listing.areaValue * SQFT[listing.areaUnit],
        bedrooms: listing.bedrooms,
        bathrooms: listing.bathrooms,
        city: listing.city,
        locality: listing.locality,
        status: listing.status,
        visibility: 'public',
        viewCount: listing.views,
        likeCount: Math.floor(listing.views / 14),
        shareCount: Math.floor(listing.views / 40),
        listingFeeCharged: listing.status !== 'draft',
        publishedAt: published,
        soldAt: listing.status === 'sold' || listing.status === 'rented' ? daysAgo(5) : null,
        salePricePaisa:
          listing.status === 'sold' && listing.priceRs !== null ? rs(listing.priceRs * 0.96) : null,
      },
    });

    propertyIds.push(property.id);

    // A handful of views and leads per listing, so the reports and insights
    // screens have something to draw rather than an empty state.
    const viewRows = Math.min(12, Math.ceil(listing.views / 100));
    if (viewRows > 0) {
      await prisma.propertyView.createMany({
        data: Array.from({ length: viewRows }, (_, i) => ({
          propertyId: property.id,
          source: (['feed', 'search', 'share', 'profile'] as const)[i % 4]!,
          viewedAt: daysAgo(i * 2 + 1),
        })),
      });
    }

    const leadRows = Math.min(5, Math.floor(listing.views / 250));
    if (leadRows > 0) {
      await prisma.lead.createMany({
        data: Array.from({ length: leadRows }, (_, i) => ({
          propertyId: property.id,
          agentId,
          channel: (['call', 'whatsapp', 'in_app', 'share_link'] as const)[i % 4]!,
          createdAt: daysAgo(i * 3 + 1),
        })),
      });
    }
  }
  console.log(`  ✓ ${LISTINGS.length} listings across every status, with views and leads`);

  // ── Invoices and payments ─────────────────────────────────────────────────
  //
  // Six months of them, so the revenue chart has a shape. The invoice number
  // carries the DEMO- prefix, which is the other half of the cleanup marker.
  let invoiceCount = 0;
  let paymentCount = 0;

  for (const spec of AGENTS) {
    const agentId = agentIds.get(spec.slot);
    if (!agentId) continue;

    const monthly = PLANS[spec.plan].pricePaisa;

    for (let monthsBack = 5; monthsBack >= 0; monthsBack -= 1) {
      const periodStart = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() - monthsBack + 1, 0);

      // A couple of extra listings some months, so the totals are not a flat line.
      const extras = (spec.slot + monthsBack) % 3;
      const total = BigInt(monthly) + BigInt(extras) * BigInt(EXTRA_LISTING_FEE_PAISA);

      // The current month is still open; everything older is settled.
      const settled = monthsBack > 0;

      const invoice = await prisma.invoice.create({
        data: {
          agentId,
          number: `${DEMO_INVOICE_PREFIX}${periodStart.getFullYear()}${String(periodStart.getMonth() + 1).padStart(2, '0')}-${String(spec.slot).padStart(3, '0')}`,
          periodStart,
          periodEnd,
          subtotalPaisa: total,
          totalPaisa: total,
          amountPaidPaisa: settled ? total : BigInt(0),
          status: settled ? 'paid' : 'due',
          dueAt: new Date(periodEnd.getTime() + 7 * 86_400_000),
          paidAt: settled ? new Date(periodEnd.getTime() + 2 * 86_400_000) : null,
          items: {
            create: [
              {
                type: 'subscription',
                descriptionUr: 'ماہانہ پلان',
                descriptionEn: 'Monthly plan',
                amountPaisa: BigInt(monthly),
              },
              ...(extras > 0
                ? [
                    {
                      type: 'listing_fee' as const,
                      descriptionUr: 'اضافی اشتہار کی فیس',
                      descriptionEn: 'Extra listing fee',
                      amountPaisa: BigInt(extras) * BigInt(EXTRA_LISTING_FEE_PAISA),
                    },
                  ]
                : []),
            ],
          },
        },
      });
      invoiceCount += 1;

      if (settled) {
        await prisma.payment.create({
          data: {
            agentId,
            invoiceId: invoice.id,
            amountPaisa: total,
            provider: spec.slot % 2 === 0 ? 'manual_jazzcash' : 'manual_easypaisa',
            providerTxnId: `DEMO-TXN-${spec.slot}-${monthsBack}`,
            payerMsisdn: phoneFor(spec.slot),
            status: 'verified',
            verifiedAt: new Date(periodEnd.getTime() + 2 * 86_400_000),
            createdAt: new Date(periodEnd.getTime() + 86_400_000),
          },
        });
        paymentCount += 1;
      }
    }
  }

  // ── The payment queue ─────────────────────────────────────────────────────
  //
  // Three pending payments, deliberately different so the queue screen shows
  // each of its states: a clean one, one whose amount does NOT match the
  // invoice, and one with no transaction id. The mismatch is the case an
  // operator most needs to catch, so it must be visible in demo data.
  const queueSpecs = [
    { slot: 1, delta: 0, txn: 'EP-77341902', provisional: 47 },
    { slot: 2, delta: -100, txn: null, provisional: null },
    { slot: 5, delta: 0, txn: 'JC-55120388', provisional: 12 },
  ] as const;

  for (const spec of queueSpecs) {
    const agentId = agentIds.get(spec.slot);
    if (!agentId) continue;

    const openInvoice = await prisma.invoice.findFirst({
      where: { agentId, status: 'due' },
      orderBy: { periodStart: 'desc' },
    });
    if (!openInvoice) continue;

    await prisma.payment.create({
      data: {
        agentId,
        invoiceId: openInvoice.id,
        amountPaisa: openInvoice.totalPaisa + rs(spec.delta),
        provider: spec.slot % 2 === 0 ? 'manual_jazzcash' : 'manual_easypaisa',
        providerTxnId: spec.txn,
        payerMsisdn: phoneFor(spec.slot),
        status: 'pending',
        provisionalUntil: spec.provisional === null ? null : minutesFromNow(spec.provisional),
        createdAt: daysAgo(spec.slot % 3),
      },
    });
    paymentCount += 1;
  }

  console.log(`  ✓ ${invoiceCount} invoices and ${paymentCount} payments`);
  console.log(`  ✓ ${queueSpecs.length} payments waiting in the verification queue`);
  console.log(`    (one with an amount that does NOT match its invoice — that is deliberate)`);

  console.log('\nSign in to the admin panel with 0300 9999999 and the dev OTP.');
  console.log(`Remove all of this later with:  pnpm --filter @ghar/api demo:clean\n`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
