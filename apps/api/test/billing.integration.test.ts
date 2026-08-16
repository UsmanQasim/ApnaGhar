import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, test } from 'node:test';

import { EXTRA_LISTING_FEE_PAISA, PlanCode } from '@ghar/shared';

import { BillingService } from '../src/billing/billing.service';
import { ListingsService } from '../src/listings/listings.service';
import { PrismaService } from '../src/common/prisma.service';
import {
  balanceOf,
  createAgent,
  createDraft,
  listingFeeCount,
  migrateOnce,
  prisma,
  reset,
} from './harness';

/**
 * These test the things a unit test structurally cannot: real transactions,
 * real unique constraints, and real concurrency.
 *
 * Every case here is a way an agent could be double-charged or under-charged.
 * Those bugs do not throw — they quietly produce a wrong invoice, and you find
 * out from an angry agent rather than a stack trace.
 */

const prismaService = prisma as unknown as PrismaService;
const billing = new BillingService(prismaService);
const listings = new ListingsService(prismaService, billing);

before(() => migrateOnce());
beforeEach(() => reset());
after(() => prisma.$disconnect());

describe('listing fee charging', () => {
  test('first three listings on basic are free', async () => {
    const agent = await createAgent(PlanCode.BASIC);

    for (let i = 0; i < 3; i++) {
      const id = await createDraft(agent.userId, `listing ${i}`);
      const result = await listings.publish(agent.userId, id, false);
      assert.equal(result.feePaisa, 0, `listing ${i + 1} should be free`);
    }

    assert.equal(await balanceOf(agent.userId), BigInt(0));
  });

  test('fourth listing charges exactly Rs 50', async () => {
    const agent = await createAgent(PlanCode.BASIC);

    for (let i = 0; i < 3; i++) {
      await listings.publish(agent.userId, await createDraft(agent.userId), false);
    }

    const fourth = await createDraft(agent.userId);
    const result = await listings.publish(agent.userId, fourth, false);

    assert.equal(result.feePaisa, EXTRA_LISTING_FEE_PAISA);
    assert.equal(await balanceOf(agent.userId), BigInt(EXTRA_LISTING_FEE_PAISA));
    assert.equal(await listingFeeCount(fourth), 1);
  });

  /**
   * The double-tap. An agent on a slow connection taps Publish, sees nothing
   * happen, and taps again. Without the transaction + `listingFeeCharged`
   * guard this bills him twice for one listing.
   */
  test('publishing the same listing twice charges once', async () => {
    const agent = await createAgent(PlanCode.BASIC);
    for (let i = 0; i < 3; i++) {
      await listings.publish(agent.userId, await createDraft(agent.userId), false);
    }

    const id = await createDraft(agent.userId);
    await listings.publish(agent.userId, id, false);
    const second = await listings.publish(agent.userId, id, false);

    assert.equal(second.alreadyActive, true);
    assert.equal(second.feePaisa, 0);
    assert.equal(await listingFeeCount(id), 1);
    assert.equal(await balanceOf(agent.userId), BigInt(EXTRA_LISTING_FEE_PAISA));
  });

  /**
   * The genuine race: two taps land in parallel, both read the quota before
   * either writes. Only the unique constraint on
   * (invoice_items.type, referenceId) can stop this — application logic alone
   * cannot, because both transactions see the same pre-state.
   */
  test('two concurrent publishes of one listing charge once', async () => {
    const agent = await createAgent(PlanCode.BASIC);
    for (let i = 0; i < 3; i++) {
      await listings.publish(agent.userId, await createDraft(agent.userId), false);
    }

    const id = await createDraft(agent.userId);

    const results = await Promise.allSettled([
      listings.publish(agent.userId, id, false),
      listings.publish(agent.userId, id, false),
    ]);

    // One may reject on the constraint; that is the constraint doing its job.
    assert.ok(results.some((r) => r.status === 'fulfilled'));
    assert.equal(await listingFeeCount(id), 1);
    assert.equal(await balanceOf(agent.userId), BigInt(EXTRA_LISTING_FEE_PAISA));
  });

  test('re-publishing a sold listing does not charge again', async () => {
    const agent = await createAgent(PlanCode.BASIC);
    for (let i = 0; i < 3; i++) {
      await listings.publish(agent.userId, await createDraft(agent.userId), false);
    }

    const id = await createDraft(agent.userId);
    await listings.publish(agent.userId, id, false);
    await listings.markOutcome(agent.userId, id, { outcome: 'sold' });
    await listings.publish(agent.userId, id, false);

    assert.equal(await listingFeeCount(id), 1);
    assert.equal(await balanceOf(agent.userId), BigInt(EXTRA_LISTING_FEE_PAISA));
  });

  test('premium is never charged a listing fee, at any count', async () => {
    const agent = await createAgent(PlanCode.PREMIUM);

    for (let i = 0; i < 25; i++) {
      const result = await listings.publish(agent.userId, await createDraft(agent.userId), false);
      assert.equal(result.feePaisa, 0, `premium listing ${i + 1} should be free`);
    }

    assert.equal(await balanceOf(agent.userId), BigInt(0));
  });
});

describe('quota is on ACTIVE listings', () => {
  test('marking sold frees a slot, so the next listing is free again', async () => {
    const agent = await createAgent(PlanCode.BASIC);

    const ids: string[] = [];
    for (let i = 0; i < 3; i++) {
      const id = await createDraft(agent.userId);
      await listings.publish(agent.userId, id, false);
      ids.push(id);
    }

    // Quota full: the next one would cost.
    let quota = await billing.getQuota(agent.userId);
    assert.equal(quota.slotsRemaining, 0);

    await listings.markOutcome(agent.userId, ids[0] as string, { outcome: 'sold' });

    quota = await billing.getQuota(agent.userId);
    assert.equal(quota.slotsRemaining, 1);
    assert.equal(quota.activeListings, 2);

    const next = await createDraft(agent.userId);
    const result = await listings.publish(agent.userId, next, false);
    assert.equal(result.feePaisa, 0);
  });

  test('drafts do not consume quota', async () => {
    const agent = await createAgent(PlanCode.BASIC);
    for (let i = 0; i < 5; i++) await createDraft(agent.userId);

    const quota = await billing.getQuota(agent.userId);
    assert.equal(quota.activeListings, 0);
    assert.equal(quota.slotsRemaining, 3);
  });
});

describe('subscription restriction', () => {
  test('a restricted agent cannot publish, and nothing is deleted', async () => {
    const agent = await createAgent(PlanCode.BASIC, 'restricted');
    const id = await createDraft(agent.userId);

    await assert.rejects(() => listings.publish(agent.userId, id, false), /restricted/);

    // The draft survives untouched — restriction hides work, never destroys it.
    const still = await prisma.property.findUnique({ where: { id } });
    assert.ok(still);
    assert.equal(still.status, 'draft');
  });

  test('a past_due agent inside the grace window can still publish', async () => {
    const agent = await createAgent(PlanCode.BASIC, 'past_due');
    const id = await createDraft(agent.userId);

    const result = await listings.publish(agent.userId, id, false);
    assert.equal(result.feePaisa, 0);
  });
});

describe('ledger integrity', () => {
  test('the ledger is append-only — the DB trigger blocks updates', async () => {
    const agent = await createAgent(PlanCode.BASIC);
    for (let i = 0; i < 4; i++) {
      await listings.publish(agent.userId, await createDraft(agent.userId), false);
    }

    const entry = await prisma.ledgerEntry.findFirstOrThrow({ where: { agentId: agent.userId } });

    await assert.rejects(
      () =>
        prisma.ledgerEntry.update({
          where: { id: entry.id },
          data: { amountPaisa: BigInt(1) },
        }),
      /append-only/,
    );

    await assert.rejects(
      () => prisma.ledgerEntry.delete({ where: { id: entry.id } }),
      /append-only/,
    );
  });

  test('running balance matches the sum of entries', async () => {
    const agent = await createAgent(PlanCode.BASIC);
    for (let i = 0; i < 6; i++) {
      await listings.publish(agent.userId, await createDraft(agent.userId), false);
    }

    const entries = await prisma.ledgerEntry.findMany({
      where: { agentId: agent.userId },
      orderBy: { createdAt: 'asc' },
    });

    const computed = entries.reduce(
      (acc, e) => acc + (e.direction === 'debit' ? e.amountPaisa : -e.amountPaisa),
      BigInt(0),
    );

    assert.equal(computed, await balanceOf(agent.userId));
    // 3 free + 3 chargeable = Rs 150
    assert.equal(computed, BigInt(3 * EXTRA_LISTING_FEE_PAISA));
  });
});

describe('cycle close', () => {
  test('closing a cycle adds the subscription line and moves the period', async () => {
    const agent = await createAgent(PlanCode.BASIC);
    await listings.publish(agent.userId, await createDraft(agent.userId), false);

    const before = await prisma.subscription.findUniqueOrThrow({
      where: { agentId: agent.userId },
    });

    const { invoiceId } = await billing.closeCycle(agent.userId);

    const invoice = await prisma.invoice.findUniqueOrThrow({
      where: { id: invoiceId },
      include: { items: true },
    });

    // One free listing, so the only line is the Rs 100 subscription.
    assert.equal(invoice.totalPaisa, BigInt(10_000));
    assert.equal(invoice.status, 'due');
    assert.ok(invoice.items.some((i) => i.type === 'subscription'));

    const after = await prisma.subscription.findUniqueOrThrow({
      where: { agentId: agent.userId },
    });
    assert.equal(after.status, 'past_due');
    assert.ok(after.currentPeriodStart.getTime() === before.currentPeriodEnd.getTime());
    assert.ok(after.graceEndsAt !== null);
  });
});
