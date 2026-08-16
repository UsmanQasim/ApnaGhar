import assert from 'node:assert/strict';
import { test } from 'node:test';

import { PlanCode, PropertyStatus, QUOTA_CONSUMING_STATUSES } from './enums';
import { proratedCredit, rupeesToPaisa, splitPaisa, sumPaisa } from './money';
import {
  EXTRA_LISTING_FEE_PAISA,
  PLANS,
  evaluateListingPublish,
  premiumBreakEvenListings,
  premiumSavingOrNull,
  projectCost,
} from './pricing';

// ── The README §2 cost table. If these break, the docs are lying to agents. ──

test('README pricing table: basic plan first-month cost', () => {
  const cases: Array<[listings: number, rupees: number]> = [
    [1, 100],
    [3, 100],
    [5, 200],
    [10, 450],
    [20, 950],
  ];
  for (const [listings, rupees] of cases) {
    assert.equal(
      projectCost(PlanCode.BASIC, listings).firstMonthPaisa,
      rupeesToPaisa(rupees),
      `${listings} listings should cost Rs ${rupees}`,
    );
  }
});

test('basic plan settles back to Rs 100/mo because listing fees are one-time', () => {
  assert.equal(projectCost(PlanCode.BASIC, 20).recurringPaisa, rupeesToPaisa(100));
});

test('premium break-even is exactly 21 listings (the sales pitch)', () => {
  assert.equal(premiumBreakEvenListings(), 21);
  // At 20 basic is still marginally cheaper; at 21 they meet and premium wins after.
  assert.equal(projectCost(PlanCode.BASIC, 20).firstMonthPaisa, rupeesToPaisa(950));
  assert.equal(projectCost(PlanCode.BASIC, 21).firstMonthPaisa, rupeesToPaisa(1000));
  assert.equal(projectCost(PlanCode.PREMIUM, 21).firstMonthPaisa, rupeesToPaisa(1000));
  assert.equal(projectCost(PlanCode.BASIC, 30).firstMonthPaisa, rupeesToPaisa(1450));
  assert.equal(projectCost(PlanCode.PREMIUM, 30).firstMonthPaisa, rupeesToPaisa(1000));
});

test('premium is unlimited, basic includes 3', () => {
  assert.equal(PLANS[PlanCode.BASIC].includedListings, 3);
  assert.equal(PLANS[PlanCode.PREMIUM].includedListings, null);
});

// ── Quota ───────────────────────────────────────────────────────────────────

test('first three listings on basic are free', () => {
  for (let active = 0; active < 3; active++) {
    const d = evaluateListingPublish({ plan: PlanCode.BASIC, activeListings: active });
    assert.equal(d.withinIncludedQuota, true);
    assert.equal(d.feePaisa, 0);
    assert.equal(d.slotsRemaining, 3 - active);
  }
});

test('fourth listing on basic costs Rs 50', () => {
  const d = evaluateListingPublish({ plan: PlanCode.BASIC, activeListings: 3 });
  assert.equal(d.withinIncludedQuota, false);
  assert.equal(d.feePaisa, EXTRA_LISTING_FEE_PAISA);
  assert.equal(d.feePaisa, rupeesToPaisa(50));
  assert.equal(d.slotsRemaining, 0);
});

test('a property already charged is never charged again on re-publish', () => {
  const d = evaluateListingPublish({ plan: PlanCode.BASIC, activeListings: 10 }, true);
  assert.equal(d.feePaisa, 0);
});

test('marking sold frees a quota slot', () => {
  // 4 active, one gets marked sold -> back to 3 -> next publish is free again.
  const afterSale = evaluateListingPublish({ plan: PlanCode.BASIC, activeListings: 2 });
  assert.equal(afterSale.feePaisa, 0);
  assert.ok(!QUOTA_CONSUMING_STATUSES.includes(PropertyStatus.SOLD));
  assert.ok(!QUOTA_CONSUMING_STATUSES.includes(PropertyStatus.RENTED));
  assert.ok(QUOTA_CONSUMING_STATUSES.includes(PropertyStatus.ACTIVE));
});

test('premium never charges a listing fee, at any count', () => {
  for (const activeListings of [0, 19, 20, 100, 5000]) {
    const d = evaluateListingPublish({ plan: PlanCode.PREMIUM, activeListings });
    assert.equal(d.feePaisa, 0, `premium should be free at ${activeListings} listings`);
    assert.equal(d.withinIncludedQuota, true);
    assert.equal(d.slotsRemaining, Number.POSITIVE_INFINITY);
  }
});

// ── Upsell honesty ──────────────────────────────────────────────────────────

test('premium upsell shows nothing when it would not have saved money', () => {
  // Agent spent Rs 300 over 3 cycles. Premium would have cost Rs 3,000.
  assert.equal(premiumSavingOrNull(rupeesToPaisa(300), 3), null);
});

test('premium upsell shows a real saving for a high-turnover agent', () => {
  // Rs 3,500 over 3 cycles vs Rs 3,000 premium -> Rs 500 saved.
  assert.equal(premiumSavingOrNull(rupeesToPaisa(3500), 3), rupeesToPaisa(500));
});

// ── Money primitives ────────────────────────────────────────────────────────

test('money is integer paisa only', () => {
  assert.equal(rupeesToPaisa(100), 10_000);
  assert.equal(rupeesToPaisa(0.5), 50);
  assert.throws(() => sumPaisa([1.5, 2]), RangeError);
});

test('splitPaisa never loses or creates paisa', () => {
  const parts = splitPaisa(10_000, 3);
  assert.equal(sumPaisa(parts), 10_000);
  assert.deepEqual(parts, [3334, 3333, 3333]);
});

test('prorated credit on mid-cycle upgrade', () => {
  const start = new Date('2026-08-01T00:00:00Z');
  const end = new Date('2026-08-31T00:00:00Z');
  const halfway = new Date('2026-08-16T00:00:00Z');
  assert.equal(proratedCredit(10_000, start, end, halfway), 5_000);
  assert.equal(proratedCredit(10_000, start, end, start), 10_000);
  assert.equal(proratedCredit(10_000, start, end, end), 0);
  // Past the end of the period there is nothing left to credit.
  assert.equal(proratedCredit(10_000, start, end, new Date('2026-09-10T00:00:00Z')), 0);
});
