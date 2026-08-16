import { PlanCode } from './enums';
import { paisa, type Paisa, sumPaisa } from './money';

/**
 * Single source of truth for the pricing model described in README §2.
 *
 *   Basic   Rs 100/mo, includes 3 concurrently ACTIVE listings
 *   Premium Rs 1,000/mo, UNLIMITED listings
 *   Extra listing: Rs 50 ONE TIME per property, charged at first publish
 *
 * Quota is on ACTIVE listings, so marking a property sold/rented frees a slot.
 * The Rs 50 is never refunded and never re-charged for the same property.
 *
 * Why premium is unlimited rather than "20 included": if premium also charged
 * Rs 50 beyond a cap, basic would be cheaper than premium at EVERY listing
 * count — the two lines never cross, they just run Rs 50 apart forever. The
 * break-even the sales pitch depends on would not exist. Unlimited makes the
 * crossover real (21 listings) and the pitch true.
 */

export interface PlanDefinition {
  code: PlanCode;
  pricePaisa: Paisa;
  /** null = unlimited. */
  includedListings: number | null;
}

export const PLANS: Record<PlanCode, PlanDefinition> = {
  [PlanCode.BASIC]: {
    code: PlanCode.BASIC,
    pricePaisa: paisa(10_000), // Rs 100
    includedListings: 3,
  },
  [PlanCode.PREMIUM]: {
    code: PlanCode.PREMIUM,
    pricePaisa: paisa(100_000), // Rs 1,000
    includedListings: null, // unlimited
  },
};

/** Rs 50, one time, per listing beyond the plan's included quota. */
export const EXTRA_LISTING_FEE_PAISA: Paisa = paisa(5_000);

export const BILLING_CYCLE_DAYS = 30;
export const GRACE_PERIOD_DAYS = 7;
export const DORMANT_AFTER_DAYS = 90;

/** Prepay bundles — fewer transactions, which matters a lot on a Rs 100 ticket. */
export const PREPAY_BUNDLES = [
  { months: 1, pricePaisa: paisa(10_000) }, // Rs 100
  { months: 3, pricePaisa: paisa(27_000) }, // Rs 270  (10% off)
  { months: 12, pricePaisa: paisa(100_000) }, // Rs 1,000 (~17% off)
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Quota
// ─────────────────────────────────────────────────────────────────────────────

export interface QuotaState {
  plan: PlanCode;
  /** Count of properties currently in a QUOTA_CONSUMING_STATUS. */
  activeListings: number;
}

export interface QuotaDecision {
  /** True when publishing this listing costs nothing extra. */
  withinIncludedQuota: boolean;
  /** Rs 50 in paisa, or 0 when within quota. */
  feePaisa: Paisa;
  /** null = unlimited. */
  includedListings: number | null;
  /** Infinity on an unlimited plan. */
  slotsRemaining: number;
}

/**
 * Decide what publishing ONE more listing costs.
 *
 * `alreadyPaidForThisProperty` matters: a property that was published, then
 * archived, then re-published must not be charged twice. The Rs 50 is bound to
 * the property, not to the publish action.
 */
export function evaluateListingPublish(
  state: QuotaState,
  alreadyPaidForThisProperty = false,
): QuotaDecision {
  const plan = PLANS[state.plan];
  const slotsRemaining =
    plan.includedListings === null
      ? Number.POSITIVE_INFINITY
      : Math.max(0, plan.includedListings - state.activeListings);
  const withinIncludedQuota = slotsRemaining > 0;
  const feePaisa =
    withinIncludedQuota || alreadyPaidForThisProperty ? paisa(0) : EXTRA_LISTING_FEE_PAISA;

  return {
    withinIncludedQuota,
    feePaisa,
    includedListings: plan.includedListings,
    slotsRemaining,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Cost projection (used by the dashboard + the premium upsell)
// ─────────────────────────────────────────────────────────────────────────────

export interface CostBreakdown {
  plan: PlanCode;
  subscriptionPaisa: Paisa;
  includedListings: number | null;
  chargeableListings: number;
  listingFeesPaisa: Paisa;
  /** Subscription + one-time listing fees. What the agent pays THIS month. */
  firstMonthPaisa: Paisa;
  /** Subscription only. What the agent pays every month after, if he adds nothing new. */
  recurringPaisa: Paisa;
}

/**
 * Total cost of holding `listings` concurrently active listings, assuming all
 * of them are newly published this cycle.
 */
export function projectCost(plan: PlanCode, listings: number): CostBreakdown {
  if (!Number.isInteger(listings) || listings < 0) {
    throw new RangeError(`listings must be a non-negative integer, got ${listings}`);
  }
  const def = PLANS[plan];
  const chargeableListings =
    def.includedListings === null ? 0 : Math.max(0, listings - def.includedListings);
  const listingFeesPaisa = paisa(chargeableListings * EXTRA_LISTING_FEE_PAISA);

  return {
    plan,
    subscriptionPaisa: def.pricePaisa,
    includedListings: def.includedListings,
    chargeableListings,
    listingFeesPaisa,
    firstMonthPaisa: sumPaisa([def.pricePaisa, listingFeesPaisa]),
    recurringPaisa: def.pricePaisa,
  };
}

/**
 * Listing count at which premium stops costing more than basic for a cycle.
 * With the current numbers this is 21 — the whole pitch rests on it, so it is
 * computed rather than hardcoded, and asserted in the tests. If someone later
 * caps premium's listings, this returns Infinity and the test fails loudly
 * rather than the app quietly telling agents something untrue.
 */
export function premiumBreakEvenListings(): number {
  for (let n = 0; n <= 1000; n++) {
    if (projectCost(PlanCode.BASIC, n).firstMonthPaisa >= projectCost(PlanCode.PREMIUM, n).firstMonthPaisa) {
      return n;
    }
  }
  return Number.POSITIVE_INFINITY;
}

/**
 * Honest premium upsell: compare what the agent ACTUALLY spent over the last
 * N cycles against what premium would have cost. Returns null when premium
 * would not have saved him money — in which case show nothing. Do not invent
 * a saving from a theoretical listing count he has never reached.
 */
export function premiumSavingOrNull(actualSpendPaisa: Paisa, cycles: number): Paisa | null {
  if (cycles <= 0) return null;
  const premiumSpend = paisa(PLANS[PlanCode.PREMIUM].pricePaisa * cycles);
  const saving = actualSpendPaisa - premiumSpend;
  return saving > 0 ? paisa(saving) : null;
}
