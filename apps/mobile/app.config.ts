import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Everything static still lives in `app.json`; this file exists for the one
 * value that cannot be static — the API host.
 *
 * `extra.apiBaseUrl` used to be hard-coded to `http://localhost:3000/api`,
 * which is wrong in all three of the places the app actually runs:
 *  • on a physical phone in Expo Go, `localhost` is the phone itself
 *  • in a preview build, there is no local API at all
 *  • in a release build, it must be the deployed one
 *
 * Order of precedence, most specific first:
 *  1. `EXPO_PUBLIC_API_URL` — set it when pointing at a local API or a branch
 *     deployment. On a real device this must be your machine's LAN address
 *     (e.g. http://192.168.1.42:3000/api), never localhost.
 *  2. the deployed API.
 *
 * The `/api` suffix belongs here: `main.ts` puts every route except `s/:token`
 * and `health` behind the global `api` prefix.
 */
const DEPLOYED_API = 'https://apna-ghar-api.vercel.app/api';

function apiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (!fromEnv) return DEPLOYED_API;

  // A trailing slash turns every request path into a double slash, which some
  // proxies 404 before the app ever sees them.
  return fromEnv.replace(/\/+$/, '');
}

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name ?? 'Ghar',
  slug: config.slug ?? 'ghar',
  extra: {
    ...config.extra,
    apiBaseUrl: apiBaseUrl(),
  },
});
