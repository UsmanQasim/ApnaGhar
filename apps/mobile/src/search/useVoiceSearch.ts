import { useCallback, useState } from 'react';

/**
 * Voice search — the single most important affordance in this product, because
 * the target user may not be able to type Urdu, or to type at all.
 *
 * ⚠️ NOT YET WIRED TO A RECOGNISER. `expo-speech` is text-to-SPEECH only; there
 * is no speech-to-text dependency in this app, and adding one
 * (`expo-speech-recognition`, `@react-native-voice/voice`) needs a native
 * rebuild rather than an OTA update.
 *
 * The UI is built and reachable. This hook is the single integration point:
 * implement `start()` against the recogniser, keep this shape, and every mic
 * button in the app starts working at once. Until then it reports itself
 * unavailable rather than silently doing nothing — a dead button on the most
 * prominent control on screen teaches the user the whole app is broken.
 */
export interface VoiceSearch {
  supported: boolean;
  listening: boolean;
  /** Resolves with the recognised Urdu text, or null when unavailable. */
  start: () => Promise<string | null>;
  stop: () => void;
}

export function useVoiceSearch(): VoiceSearch {
  const [listening, setListening] = useState(false);

  const start = useCallback(async () => {
    setListening(false);
    return null;
  }, []);

  const stop = useCallback(() => setListening(false), []);

  return { supported: false, listening, start, stop };
}
