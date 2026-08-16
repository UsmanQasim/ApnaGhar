import { PrismaClient } from '@prisma/client';

import { EXTRA_LISTING_FEE_PAISA, PLANS, PlanCode } from '@ghar/shared';

const prisma = new PrismaClient();

/**
 * Seed: plans, a starter locality list, and one demo agent so the create-listing
 * flow is testable end to end without touching the admin panel.
 */

const LOCALITIES: Array<{ city: string; nameEn: string; nameUr: string }> = [
  { city: 'Lahore', nameEn: 'Johar Town', nameUr: 'جوہر ٹاؤن' },
  { city: 'Lahore', nameEn: 'DHA', nameUr: 'ڈی ایچ اے' },
  { city: 'Lahore', nameEn: 'Model Town', nameUr: 'ماڈل ٹاؤن' },
  { city: 'Lahore', nameEn: 'Bahria Town', nameUr: 'بحریہ ٹاؤن' },
  { city: 'Lahore', nameEn: 'Gulberg', nameUr: 'گلبرگ' },
  { city: 'Karachi', nameEn: 'Gulshan-e-Iqbal', nameUr: 'گلشنِ اقبال' },
  { city: 'Karachi', nameEn: 'DHA', nameUr: 'ڈی ایچ اے' },
  { city: 'Karachi', nameEn: 'North Nazimabad', nameUr: 'نارتھ ناظم آباد' },
  { city: 'Karachi', nameEn: 'Clifton', nameUr: 'کلفٹن' },
  { city: 'Islamabad', nameEn: 'F-11', nameUr: 'ایف ۱۱' },
  { city: 'Islamabad', nameEn: 'G-13', nameUr: 'جی ۱۳' },
  { city: 'Islamabad', nameEn: 'Bahria Enclave', nameUr: 'بحریہ انکلیو' },
  { city: 'Rawalpindi', nameEn: 'Satellite Town', nameUr: 'سیٹلائٹ ٹاؤن' },
  { city: 'Faisalabad', nameEn: 'Madina Town', nameUr: 'مدینہ ٹاؤن' },
  { city: 'Multan', nameEn: 'Gulgasht Colony', nameUr: 'گلگشت کالونی' },
  { city: 'Peshawar', nameEn: 'Hayatabad', nameUr: 'حیات آباد' },
];

async function main(): Promise<void> {
  // ── Plans ──────────────────────────────────────────────────────────────────
  for (const code of [PlanCode.BASIC, PlanCode.PREMIUM] as const) {
    const plan = PLANS[code];
    await prisma.plan.upsert({
      where: { code },
      update: {
        pricePaisa: BigInt(plan.pricePaisa),
        includedListings: plan.includedListings,
      },
      create: {
        code,
        pricePaisa: BigInt(plan.pricePaisa),
        includedListings: plan.includedListings,
        features:
          code === PlanCode.PREMIUM
            ? {
                topSearchPlacement: true,
                featuredHomeCarousel: true,
                monthlyBoosts: 3,
                demandInsights: true,
                listingAnalytics: true,
                verifiedBadge: true,
                autoFlyer: true,
                bulkTools: true,
                unlimitedShareLinks: true,
                prioritySupport: true,
              }
            : { monthlyBoosts: 0 },
      },
    });
  }
  console.log(
    `✓ plans — basic Rs ${PLANS.basic.pricePaisa / 100}/mo (${PLANS.basic.includedListings} listings), ` +
      `premium Rs ${PLANS.premium.pricePaisa / 100}/mo (unlimited listings), ` +
      `extra listing Rs ${EXTRA_LISTING_FEE_PAISA / 100}`,
  );

  // ── Localities ─────────────────────────────────────────────────────────────
  for (const locality of LOCALITIES) {
    await prisma.locality.upsert({
      where: { city_nameEn: { city: locality.city, nameEn: locality.nameEn } },
      update: { nameUr: locality.nameUr },
      create: locality,
    });
  }
  console.log(`✓ ${LOCALITIES.length} localities`);

  // ── Demo agent ─────────────────────────────────────────────────────────────
  if (process.env.NODE_ENV !== 'production') {
    const user = await prisma.user.upsert({
      where: { phone: '+923001234567' },
      update: {},
      create: {
        phone: '+923001234567',
        name: 'Demo Agent',
        role: 'agent',
        locale: 'ur',
      },
    });

    await prisma.agent.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        agencyName: 'Demo Property Consultants',
        city: 'Lahore',
        serviceAreas: ['Johar Town', 'Model Town'],
        isVerified: true,
      },
    });

    const now = new Date();
    await prisma.subscription.upsert({
      where: { agentId: user.id },
      update: {},
      create: {
        agentId: user.id,
        planCode: PlanCode.BASIC,
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: new Date(now.getTime() + 30 * 86_400_000),
      },
    });

    const admin = await prisma.user.upsert({
      where: { phone: '+923009999999' },
      update: {},
      create: { phone: '+923009999999', name: 'Admin', role: 'admin', locale: 'en' },
    });

    console.log(`✓ demo agent +923001234567 (basic plan, 3 free listings)`);
    console.log(`✓ admin ${admin.phone}`);
    console.log(`  dev OTP is ${process.env.OTP_DEV_CODE ?? '123456'}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
