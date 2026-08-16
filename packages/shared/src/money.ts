/**
 * Money in this codebase is ALWAYS an integer number of paisa.
 *
 *   Rs 1      = 100 paisa
 *   Rs 100    = 10_000 paisa   (basic plan)
 *   Rs 50     = 5_000 paisa    (extra listing fee)
 *   Rs 1,000  = 100_000 paisa  (premium plan)
 *
 * Never store or compute money as a float. `0.1 + 0.2 !== 0.3` is not a bug
 * you want to discover in an invoice.
 */

export type Paisa = number;

export const PAISA_PER_RUPEE = 100;

/** Branded-ish constructor. Throws on non-integer / negative-where-invalid input. */
export function paisa(value: number): Paisa {
  if (!Number.isInteger(value)) {
    throw new RangeError(`Paisa must be an integer, got ${value}`);
  }
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`Paisa out of safe integer range: ${value}`);
  }
  return value;
}

export function rupeesToPaisa(rupees: number): Paisa {
  return paisa(Math.round(rupees * PAISA_PER_RUPEE));
}

export function paisaToRupees(value: Paisa): number {
  return value / PAISA_PER_RUPEE;
}

/** Sum with overflow + integer safety. */
export function sumPaisa(values: readonly Paisa[]): Paisa {
  return paisa(values.reduce((acc, v) => acc + v, 0));
}

/**
 * Pro-rate an amount across a period. Uses floor + remainder-to-first so the
 * parts always sum exactly back to `total` (no lost/created paisa).
 */
export function splitPaisa(total: Paisa, parts: number): Paisa[] {
  if (parts <= 0) throw new RangeError('parts must be > 0');
  const base = Math.floor(total / parts);
  const remainder = total - base * parts;
  return Array.from({ length: parts }, (_, i) => (i < remainder ? base + 1 : base));
}

/**
 * Credit for the unused portion of a billing period, used when an agent
 * upgrades from basic to premium mid-cycle.
 */
export function proratedCredit(
  periodAmount: Paisa,
  periodStart: Date,
  periodEnd: Date,
  at: Date,
): Paisa {
  const total = periodEnd.getTime() - periodStart.getTime();
  if (total <= 0) return 0;
  const remaining = Math.max(0, Math.min(total, periodEnd.getTime() - at.getTime()));
  return paisa(Math.floor((periodAmount * remaining) / total));
}
