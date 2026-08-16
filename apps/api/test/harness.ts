import { execSync } from 'node:child_process';

import { PrismaClient } from '@prisma/client';

import { PLANS, PlanCode } from '@ghar/shared';

/**
 * Integration test harness. Runs against a REAL Postgres with PostGIS, not a
 * mock.
 *
 * Everything in these tests concerns money, transactions and race conditions —
 * the exact things a mocked Prisma client cannot tell you about. A unit test
 * that stubs `$transaction` proves the code calls a function; it proves nothing
 * about whether two concurrent publishes can both charge Rs 50.
 */

export const prisma = new PrismaClient();

let migrated = false;

export function migrateOnce(): void {
  if (migrated) return;
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });
  execSync(
    `npx prisma db execute --file prisma/migrations/0001_postgis_and_search/migration.sql --schema prisma/schema.prisma`,
    { stdio: 'inherit' },
  );
  migrated = true;
}

/** Wipe between tests. Order matters — children before parents. */
export async function reset(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    TRUNCATE
      ledger_entries, invoice_items, invoices, payments,
      share_link_views, share_links, property_media, properties,
      subscriptions, agents, sessions, users
    RESTART IDENTITY CASCADE
  `);

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
      },
    });
  }
}

export interface TestAgent {
  userId: string;
}

export async function createAgent(
  plan: PlanCode = PlanCode.BASIC,
  status: 'active' | 'past_due' | 'restricted' = 'active',
): Promise<TestAgent> {
  const now = new Date();
  const user = await prisma.user.create({
    data: {
      phone: `+9230${Math.floor(Math.random() * 100_000_000).toString().padStart(8, '0')}`,
      role: 'agent',
    },
  });

  await prisma.agent.create({ data: { userId: user.id, city: 'Lahore' } });

  await prisma.subscription.create({
    data: {
      agentId: user.id,
      planCode: plan,
      status,
      currentPeriodStart: now,
      currentPeriodEnd: new Date(now.getTime() + 30 * 86_400_000),
    },
  });

  return { userId: user.id };
}

export async function createDraft(agentId: string, title = 'ٹیسٹ پراپرٹی'): Promise<string> {
  const property = await prisma.property.create({
    data: {
      agentId,
      purpose: 'sale',
      type: 'house',
      titleUr: title,
      areaValue: 5,
      areaUnit: 'marla',
      areaSqft: 1361.25,
      city: 'Lahore',
      pricePaisa: BigInt(850_000_000),
      status: 'draft',
    },
  });
  return property.id;
}

/** How many listing-fee items exist for a property. Should never exceed 1. */
export async function listingFeeCount(propertyId: string): Promise<number> {
  return prisma.invoiceItem.count({
    where: { type: 'listing_fee', referenceId: propertyId },
  });
}

export async function balanceOf(agentId: string): Promise<bigint> {
  const last = await prisma.ledgerEntry.findFirst({
    where: { agentId },
    orderBy: { createdAt: 'desc' },
    select: { balanceAfterPaisa: true },
  });
  return last?.balanceAfterPaisa ?? BigInt(0);
}
