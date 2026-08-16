import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  AreaUnit,
  PriceVisibility,
  PropertyPurpose,
  PropertyType,
  PropertyVisibility,
  createPropertySchema,
} from '@ghar/shared';

import { api } from '../api/client';

export interface Draft {
  id: string | null;
  purpose: PropertyPurpose | null;
  type: PropertyType | null;
  titleUr: string;
  descriptionUr: string;
  areaValue: string;
  areaUnit: AreaUnit;
  bedrooms: string;
  bathrooms: string;
  furnished: boolean;
  city: string;
  locality: string;
  addressText: string;
  location: { lat: number; lng: number } | null;
  priceRupees: string;
  priceVisibility: PriceVisibility;
  rentPeriod: 'month' | 'year';
  visibility: PropertyVisibility;
  mediaIds: string[];
}

export const EMPTY_DRAFT: Draft = {
  id: null,
  purpose: null,
  type: null,
  titleUr: '',
  descriptionUr: '',
  areaValue: '',
  areaUnit: AreaUnit.MARLA,
  bedrooms: '',
  bathrooms: '',
  furnished: false,
  city: '',
  locality: '',
  addressText: '',
  location: null,
  priceRupees: '',
  priceVisibility: PriceVisibility.PUBLIC,
  rentPeriod: 'month',
  visibility: PropertyVisibility.PUBLIC,
  mediaIds: [],
};

const STORAGE_KEY = 'ghar-listing-draft';

/**
 * Wizard state with local persistence.
 *
 * Saved to AsyncStorage on every change, not just on "save draft". An agent
 * recording a voice description on a cheap Android phone will get the app
 * backgrounded and killed by the OS mid-flow; losing eight steps of input at
 * that point is how you lose the agent, not just the listing.
 */
export function useDraft() {
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [restored, setRestored] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    void (async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          setDraft({ ...EMPTY_DRAFT, ...(JSON.parse(stored) as Partial<Draft>) });
        } catch {
          // A corrupt draft is not worth blocking the flow over.
        }
      }
      setRestored(true);
    })();
  }, []);

  const update = useCallback((patch: Partial<Draft>) => {
    setDraft((current) => {
      const next = { ...current, ...patch };

      // Debounced: AsyncStorage writes on every keystroke would jank the
      // keyboard on a low-end device.
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      }, 400);

      return next;
    });
  }, []);

  const clear = useCallback(async () => {
    setDraft(EMPTY_DRAFT);
    await AsyncStorage.removeItem(STORAGE_KEY);
  }, []);

  /** Convert wizard strings into the API's shape and validate with the shared schema. */
  const toPayload = useCallback(() => {
    const payload = {
      purpose: draft.purpose,
      type: draft.type,
      titleUr: draft.titleUr.trim(),
      descriptionUr: draft.descriptionUr.trim() || undefined,
      // Rupees in the UI, paisa on the wire. The conversion happens once, here.
      pricePaisa:
        draft.priceVisibility === PriceVisibility.ON_REQUEST
          ? undefined
          : Math.round(Number(draft.priceRupees.replace(/[^\d.]/g, '')) * 100),
      priceVisibility: draft.priceVisibility,
      rentPeriod: draft.purpose === PropertyPurpose.RENT ? draft.rentPeriod : undefined,
      areaValue: Number(draft.areaValue),
      areaUnit: draft.areaUnit,
      bedrooms: draft.bedrooms ? Number(draft.bedrooms) : undefined,
      bathrooms: draft.bathrooms ? Number(draft.bathrooms) : undefined,
      furnished: draft.furnished,
      addressText: draft.addressText.trim() || undefined,
      city: draft.city.trim(),
      locality: draft.locality.trim() || undefined,
      location: draft.location ?? undefined,
      visibility: draft.visibility,
    };

    return createPropertySchema.safeParse(payload);
  }, [draft]);

  /**
   * Create the server-side draft as soon as there is enough to save. The
   * property must exist before media can be attached to it, so this runs at
   * the start of the media step rather than at publish.
   */
  const ensureRemoteDraft = useCallback(async (): Promise<string | null> => {
    if (draft.id) return draft.id;

    const parsed = toPayload();
    if (!parsed.success) return null;

    const created = await api<{ id: string }>('/listings', {
      method: 'POST',
      body: parsed.data,
    });
    update({ id: created.id });
    return created.id;
  }, [draft.id, toPayload, update]);

  return { draft, update, clear, restored, toPayload, ensureRemoteDraft };
}
