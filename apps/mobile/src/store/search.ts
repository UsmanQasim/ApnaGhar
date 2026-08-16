import { create } from 'zustand';

import { type PropertyPurpose, type PropertyType } from '@ghar/shared';

export type SortKey = 'relevance' | 'newest' | 'price_asc' | 'price_desc' | 'nearest';

export interface SearchFilters {
  q: string;
  purpose: PropertyPurpose | null;
  type: PropertyType[];
  city: string | null;
  locality: string | null;
  minPricePaisa: number | null;
  maxPricePaisa: number | null;
  bedrooms: number | null;
  hasVideo: boolean;
  verifiedAgentsOnly: boolean;
  near: { lat: number; lng: number } | null;
  sort: SortKey;
}

export const EMPTY_FILTERS: SearchFilters = {
  q: '',
  purpose: null,
  type: [],
  city: null,
  locality: null,
  minPricePaisa: null,
  maxPricePaisa: null,
  bedrooms: null,
  hasVideo: false,
  verifiedAgentsOnly: false,
  near: null,
  sort: 'relevance',
};

interface SearchState {
  filters: SearchFilters;
  set: (patch: Partial<SearchFilters>) => void;
  toggleType: (value: PropertyType) => void;
  clear: () => void;
  /** Count of filters the user has actually changed — drives the badge on ⚙️. */
  activeCount: () => number;
}

/**
 * Filters live in a store rather than route params for two reasons:
 *
 *  1. a buyer's coordinates must never end up in a URL (the API takes them by
 *     POST body for the same reason — see SearchController)
 *  2. coming back from a property detail should return the buyer to the exact
 *     result set they left, not reset them to the top
 */
export const useSearchStore = create<SearchState>((set, get) => ({
  filters: EMPTY_FILTERS,
  set: (patch) => set((state) => ({ filters: { ...state.filters, ...patch } })),
  toggleType: (value) =>
    set((state) => ({
      filters: {
        ...state.filters,
        type: state.filters.type.includes(value)
          ? state.filters.type.filter((item) => item !== value)
          : [...state.filters.type, value],
      },
    })),
  clear: () => set({ filters: EMPTY_FILTERS }),
  activeCount: () => {
    const f = get().filters;
    let n = 0;
    if (f.purpose !== null) n++;
    if (f.type.length > 0) n++;
    if (f.city !== null) n++;
    if (f.locality !== null) n++;
    if (f.minPricePaisa !== null || f.maxPricePaisa !== null) n++;
    if (f.bedrooms !== null) n++;
    if (f.hasVideo) n++;
    if (f.verifiedAgentsOnly) n++;
    if (f.near !== null) n++;
    return n;
  },
}));

/** Shape the API expects. Nulls are dropped — the schema treats absent as "any". */
export function toSearchBody(filters: SearchFilters, cursor: string | null, limit = 20) {
  return {
    ...(filters.q.trim() ? { q: filters.q.trim() } : {}),
    ...(filters.purpose ? { purpose: filters.purpose } : {}),
    ...(filters.type.length > 0 ? { type: filters.type } : {}),
    ...(filters.city ? { city: filters.city } : {}),
    ...(filters.locality ? { locality: filters.locality } : {}),
    ...(filters.minPricePaisa !== null ? { minPricePaisa: filters.minPricePaisa } : {}),
    ...(filters.maxPricePaisa !== null ? { maxPricePaisa: filters.maxPricePaisa } : {}),
    ...(filters.bedrooms !== null ? { bedrooms: filters.bedrooms } : {}),
    ...(filters.hasVideo ? { hasVideo: true } : {}),
    ...(filters.verifiedAgentsOnly ? { verifiedAgentsOnly: true } : {}),
    ...(filters.near ? { near: filters.near } : {}),
    sort: filters.sort,
    ...(cursor ? { cursor } : {}),
    limit,
  };
}
