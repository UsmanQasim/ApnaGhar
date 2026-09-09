# Running and testing the mobile app

`apps/mobile` is the only one of the five apps that is **not** a Vercel
deployment. Vercel serves HTTP; this is a React Native app that runs on a phone.
The equivalent of "push to Vercel and get a URL" is "publish to Expo and scan a
QR code" — same idea, different host, still free and still no card.

Three ways to run it, cheapest first:

| Way | What you need | Who can use it |
|---|---|---|
| **Expo Go + LAN** | your phone and laptop on the same Wi-Fi | you |
| **Expo Go + tunnel** | nothing else | anyone you send the link to |
| **EAS build** | a free Expo account | anyone, as a real installable app |

Start with the first. You do not need a build to test the whole product.

---

## 0. What changed, and why it matters before you run anything

Three things were broken in a way that made a full test impossible. All three
are fixed; this section is here so the fixes are not mistaken for magic.

- **The API host was hard-coded to `localhost:3000`.** On a phone, `localhost`
  is the phone. Every request failed with the offline message no matter what
  was deployed. It now comes from `app.config.ts`, which reads
  `EXPO_PUBLIC_API_URL` and otherwise falls back to the deployed API.
- **There was no OTP screen.** `app/(auth)/phone.tsx` pushed to `/(auth)/otp`
  and that file did not exist, so login dead-ended on expo-router's "Unmatched
  Route" screen. `app/(auth)/otp.tsx` now exists.
- **The share screen did not exist either.** "Share listing" in *My listings*
  pushed to `/share/:id`. Same dead end. `app/share/[id].tsx` now exists.

Two smaller ones: the Post tab requested `GET /listings/publish-quote`, a route
the API has never had (it is `/listings/:id/publish-quote`), and `app.json`
pointed iOS at `./locales/*.json` files that were not in the repo, which fails
an EAS build.

---

## 1. Prerequisites

- Node 20+ and pnpm 9.12.0 — already required by the rest of the repo
- **Expo Go** on your phone (Play Store / App Store), free
- The API answering on `/health`. Check it first:
  ```
  curl https://apna-ghar-api.vercel.app/health
  ```
  You want `{"status":"ok","database":"up",...}`. If you get a 500 crash page,
  fix that before touching the app — every screen here is an API call, and
  debugging the phone while the server is down wastes an afternoon. See
  [`DEPLOYMENT.md`](./DEPLOYMENT.md).

Install once, from the repo root:

```
pnpm install
```

---

## 2. Run it against the deployed API

```
pnpm --filter @ghar/mobile exec expo start
```

Scan the QR with Expo Go (Android: the Expo Go app itself; iOS: the Camera app).

That is the whole loop. `app.config.ts` defaults to
`https://apna-ghar-api.vercel.app/api`, so with no environment variable set at
all, the app on your phone talks to the same API the admin panel does.

**If your phone and laptop are not on the same network** (or the Wi-Fi blocks
device-to-device traffic, which most café and university networks do):

```
pnpm --filter @ghar/mobile exec expo start --tunnel
```

Slower, but it works from anywhere and the link can be sent to someone else.

---

## 3. Run it against a local API

Two terminals.

```
pnpm --filter @ghar/api dev
```

```
set EXPO_PUBLIC_API_URL=http://192.168.1.42:3000/api
pnpm --filter @ghar/mobile exec expo start
```

(PowerShell: `$env:EXPO_PUBLIC_API_URL="http://192.168.1.42:3000/api"`.)

Replace `192.168.1.42` with your machine's LAN address — `ipconfig`, the IPv4
line of your Wi-Fi adapter. **Not `localhost`, not `127.0.0.1`.** Expo prints a
`exp://<ip>:8081` URL when it starts; that is the same IP.

Also allow port 3000 through Windows Firewall the first time, or the phone's
requests are dropped with no error the API ever sees.

The `/api` suffix is required. `main.ts` puts every route except `s/:token` and
`health` behind the global `api` prefix, and `EXPO_PUBLIC_API_URL` is used
verbatim (minus a trailing slash).

---

## 4. Test pass

Sign in as the seeded demo agent. `prisma/seed.ts` creates it, and it only
exists if the seed ran with `NODE_ENV` unset or `development` — see
`scripts/deploy-db.ps1`.

| Account | Number to type | Code |
|---|---|---|
| Demo agent (basic plan, 3 free listings) | `0300 1234567` | `123456` |
| Admin (for the admin panel, not this app) | `0300 9999999` | `123456` |

The code is fixed because `OTP_DEV_MODE=true`. The app now carries it forward
from the request response and prefills the OTP field, so login is two taps.
**When you set `OTP_DEV_MODE=false`, that prefill disappears on its own** — the
API stops returning `devCode` and the field starts empty.

Work down this list. Each row is a real code path, not a smoke test.

### Auth
1. Profile tab → **Sign in** → type `03001234567` → *Send code*.
2. OTP screen shows "code sent to +923001234567" and the field is prefilled.
   Six digits submit automatically.
3. You land back on Profile, now showing the number and the agent menu.
4. Kill the app and reopen it — you are still signed in (tokens persist in
   AsyncStorage).
5. **Change number** and **Resend** — resend is disabled for 60 seconds and
   counts down.

### Browse (works signed out too — test both)
6. Home tab: the feed loads. Pull to refresh. Scroll to trigger the next page.
7. Tap a property → detail screen, photos, price in Urdu magnitude words
   ("85 لاکھ", never `8500000`).
8. **Call** / **WhatsApp** on the detail screen — records a lead, then opens
   the dialer.
9. Search tab → filters → results. Try voice search if the device has it.

### Create a listing (agent only)
10. Post tab. Note the price quote appears only **after** the location step —
    that is when the draft row is created server-side, and the quote needs its
    id. Before that there is nothing to quote.
11. Add photos. If `R2_*` is unset on the API this step fails cleanly with an
    error message; everything else still works. **Video will fail** — Cloudflare
    Stream is a paid product and `CF_STREAM_*` is deliberately blank.
12. Publish. The listing appears under Profile → *My listings*.

### Share
13. My listings → a published listing → **Share listing**.
14. Pick a duration, optionally "once only", create the link, copy it.
15. Open the link in a browser — it should render the share page at
    `apna-ghar-share.vercel.app/s/<token>`. Open it twice with "once only" on:
    the second open shows the polite expired message, not a 404.
16. Revoke the link, then open it again — expired.

### Billing
17. Dashboard → the billing card shows the plan, listings used, balance.
18. Billing → history → an invoice → pay. Manual wallet flow: it shows the
    number to send money to and asks for a screenshot as proof.
19. Premium → upgrade. The plan change is immediate for premium.

### Language and layout
20. Settings → switch to English. **The app reloads** — that is deliberate.
    React Native's `forceRTL` only applies after a reload, and a half-flipped
    layout is worse than either direction.
21. In English the layout is LTR; in Urdu everything mirrors but phone numbers
    and prices stay left-to-right inside the sentence.

### Failure behaviour
22. Turn off Wi-Fi and mobile data, then tap anything → the Urdu offline
    message, not a stack trace.
23. Stop the API (or point `EXPO_PUBLIC_API_URL` at a dead host) → the
    "server is having trouble" message.

---

## 5. Sharing a real build (EAS)

Only worth doing when someone needs the app without Expo Go.

```
pnpm --filter @ghar/mobile exec eas login
pnpm --filter @ghar/mobile exec eas build:configure
pnpm --filter @ghar/mobile exec eas build --platform android --profile preview
```

The `preview` profile produces an APK that installs directly — no Play Store,
no signing ceremony. EAS's free tier queues builds behind paying customers, so
expect to wait; it costs nothing.

Set the API URL as an EAS environment variable rather than relying on the
default, so a build is explicit about what it points at:

```
pnpm --filter @ghar/mobile exec eas env:create --name EXPO_PUBLIC_API_URL --value https://apna-ghar-api.vercel.app/api
```

Before the first build, add the app icon and splash image. `app.json` declares
`splash` and `adaptiveIcon` with colours but no image files; Expo substitutes
its own defaults, which is fine for testing and not fine for anything you hand
to an agent.

---

## 6. Known gaps, so they are not rediscovered as bugs

- **Video upload does not work and is not meant to.** Cloudflare Stream starts
  at $5/month. `CF_STREAM_*` is blank on purpose; the endpoint fails cleanly.
- **`OTP_DEV_MODE=true` means anyone can log in as anyone.** The API returns
  the code in its own response. This must be `false`, with a real SMS
  aggregator configured, before a single real agent signs up.
- **Tokens live in AsyncStorage, which is not encrypted.** Acceptable while the
  access token is short-lived and the refresh token rotates. Move to
  `expo-secure-store` before the app ever holds a payment credential.
- **There is no signed-out redirect.** Browsing is anonymous by design, so
  agent-only screens are reached through Profile rather than a login wall.
