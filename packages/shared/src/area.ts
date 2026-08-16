import { AreaUnit } from './enums';

/**
 * Pakistani land units. Note the regional split: a marla is 272.25 sqft in
 * Punjab/Islamabad (the "big" marla) and 225 sqft in Karachi/Sindh. We store a
 * canonical sqft value for search, and keep the agent's original unit for
 * display, because an agent who typed "5 marla" must see "5 marla" back.
 */

export const SQFT_PER_MARLA_PUNJAB = 272.25;
export const SQFT_PER_MARLA_SINDH = 225;
export const MARLA_PER_KANAL = 20;
export const SQFT_PER_SQYD = 9;

export type MarlaStandard = 'punjab' | 'sindh';

/** Cities that use the 225 sqft marla. Everything else defaults to Punjab. */
const SINDH_CITIES = new Set(['karachi', 'hyderabad', 'sukkur', 'larkana', 'nawabshah']);

export function marlaStandardForCity(city: string | null | undefined): MarlaStandard {
  if (!city) return 'punjab';
  return SINDH_CITIES.has(city.trim().toLowerCase()) ? 'sindh' : 'punjab';
}

export function sqftPerMarla(standard: MarlaStandard): number {
  return standard === 'sindh' ? SQFT_PER_MARLA_SINDH : SQFT_PER_MARLA_PUNJAB;
}

export function toSqft(value: number, unit: AreaUnit, standard: MarlaStandard = 'punjab'): number {
  switch (unit) {
    case AreaUnit.SQFT:
      return value;
    case AreaUnit.SQYD:
      return value * SQFT_PER_SQYD;
    case AreaUnit.MARLA:
      return value * sqftPerMarla(standard);
    case AreaUnit.KANAL:
      return value * MARLA_PER_KANAL * sqftPerMarla(standard);
  }
}

export function fromSqft(sqft: number, unit: AreaUnit, standard: MarlaStandard = 'punjab'): number {
  switch (unit) {
    case AreaUnit.SQFT:
      return sqft;
    case AreaUnit.SQYD:
      return sqft / SQFT_PER_SQYD;
    case AreaUnit.MARLA:
      return sqft / sqftPerMarla(standard);
    case AreaUnit.KANAL:
      return sqft / (MARLA_PER_KANAL * sqftPerMarla(standard));
  }
}
