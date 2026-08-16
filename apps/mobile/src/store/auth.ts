import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { UserRole } from '@ghar/shared';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  userId: string | null;
  role: UserRole | null;
  phone: string | null;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: { userId: string; role: UserRole; phone: string }) => void;
  signOut: () => void;
}

/**
 * Tokens live in AsyncStorage, which is NOT encrypted. That is a deliberate
 * trade-off for now: the access token is short-lived and the refresh token is
 * revocable server-side and rotates on every use, so a stolen one is good for
 * a single request and its reuse is detectable.
 *
 * TODO(M2): move to expo-secure-store before handling any payment credential.
 * Nothing here should ever hold a wallet PIN or a card number.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      userId: null,
      role: null,
      phone: null,
      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
      setUser: ({ userId, role, phone }) => set({ userId, role, phone }),
      signOut: () =>
        set({ accessToken: null, refreshToken: null, userId: null, role: null, phone: null }),
    }),
    {
      name: 'ghar-auth',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

export const useIsSignedIn = (): boolean => useAuthStore((s) => s.accessToken !== null);
export const useIsAgent = (): boolean => useAuthStore((s) => s.role === UserRole.AGENT);
