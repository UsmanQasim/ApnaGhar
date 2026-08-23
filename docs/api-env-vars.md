# API environment variables

Everything `apps/api` reads, in one place. Paste the block at the bottom into
your host's bulk environment-variable editor, then fill the blanks.

## Boot-critical — the container will not start without these

These are read with `getOrThrow` at construction time, so a missing value is not
a failing endpoint, it is a container that crash-loops before serving anything.

| Key | Where it comes from |
|---|---|
| `DATABASE_URL` | Neon → **pooled** string (contains `-pooler`), plus `?pgbouncer=true&connection_limit=1` |
| `DIRECT_URL` | Neon → the **direct** string (no `-pooler`). Only migrations use it, but `prisma generate` fails if it is unset |
| `JWT_SECRET` | generate yourself, 32+ random bytes |
| `JWT_REFRESH_SECRET` | generate yourself, different from the above |

Generate the secrets in PowerShell:

```powershell
[Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Max 256 }))
```

Rotating either secret invalidates every issued token and logs all users out, so
set them once and leave them alone.

## Needed for specific features

| Key | Needed by | If missing |
|---|---|---|
| `SHARE_BASE_URL` | creating share links | that endpoint 500s; everything else works |
| `R2_*` | image upload and playback | media endpoints 500s |
| `CF_STREAM_*` | video upload | video endpoints 500s — **Stream is a paid product**, leave blank for the demo |
| `CRON_SECRET` | the maintenance endpoint | billing sweeps never run; the endpoint fails closed and returns 401 |
| `JAZZCASH_*` | the direct JazzCash rail | only read when `JAZZCASH_ENABLED=true` |

## Safe defaults

Everything else has a sensible default in the block below and can be left as-is
for a demo.

## ⚠️ Two that must change before real users

- `OTP_DEV_MODE=true` makes the API **return the login code in its own HTTP
  response** instead of sending an SMS. Anyone can log in as anyone. Set it to
  `false` and configure a real SMS aggregator before a single real agent signs
  up.
- `OTP_DEV_CODE=123456` is the fixed code while dev mode is on.

---

## Paste block

```dotenv
# ── Boot-critical ────────────────────────────────────────────────────────────
DATABASE_URL=
# Neon DIRECT string (no "-pooler"). Migrations only, but generate needs it set.
DIRECT_URL=
JWT_SECRET=
JWT_REFRESH_SECRET=

# ── Core ─────────────────────────────────────────────────────────────────────
NODE_ENV=production
LOG_LEVEL=info
# Shared secret for POST /api/maintenance/run — the GitHub Actions schedule that
# replaced the in-process @Cron jobs. Must match the CRON_SECRET repo secret.
CRON_SECRET=
API_BASE_URL=
SHARE_BASE_URL=https://apna-ghar-share.vercel.app

# ── Auth ─────────────────────────────────────────────────────────────────────
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=60d

# ── OTP — DEMO SETTINGS, see the warning above ───────────────────────────────
OTP_DEV_MODE=true
OTP_DEV_CODE=123456
OTP_TTL_SECONDS=300
OTP_MAX_ATTEMPTS=5
OTP_RESEND_COOLDOWN_SECONDS=60

# ── SMS ──────────────────────────────────────────────────────────────────────
SMS_PROVIDER=console
SMS_SENDER_ID=GHAR

# ── Media: Cloudflare R2 ─────────────────────────────────────────────────────
R2_ENDPOINT=
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=ghar-media
R2_PUBLIC_BASE_URL=
MEDIA_SIGNED_URL_TTL_SECONDS=900

# ── Video: Cloudflare Stream (paid — leave blank) ────────────────────────────
CF_STREAM_ACCOUNT_ID=
CF_STREAM_TOKEN=
CF_STREAM_WEBHOOK_SECRET=
VIDEO_MAX_DURATION_SECONDS=90
VIDEO_MAX_BYTES=104857600

# ── Billing (paisa — never floats) ───────────────────────────────────────────
PLAN_BASIC_PRICE_PAISA=10000
PLAN_BASIC_INCLUDED_LISTINGS=3
PLAN_PREMIUM_PRICE_PAISA=100000
PLAN_PREMIUM_INCLUDED_LISTINGS=20
EXTRA_LISTING_FEE_PAISA=5000
BILLING_CYCLE_DAYS=30
GRACE_PERIOD_DAYS=7
DORMANT_AFTER_DAYS=90
MANUAL_PAYMENT_PROVISIONAL_HOURS=24

# ── Payments ─────────────────────────────────────────────────────────────────
PAYMENTS_MANUAL_ENABLED=true
MANUAL_EASYPAISA_NUMBER=
MANUAL_EASYPAISA_ACCOUNT_TITLE=
MANUAL_JAZZCASH_NUMBER=
MANUAL_JAZZCASH_ACCOUNT_TITLE=
JAZZCASH_ENABLED=false
```

Set `API_BASE_URL` to the API's own public URL once the host has given you one.

## After the API is live

| Vercel project | Key | Value |
|---|---|---|
| `apps/admin` | `API_BASE_URL` | `https://<api-host>/api` — **with** the suffix |
| `apps/share` | `API_BASE_URL` | `https://<api-host>` — **without** it |

Vercel bakes environment variables in at build time, so redeploy both projects
after saving. Admin appends paths like `/admin/agents/…` and needs the prefix;
share fetches `/s/:token`, which `main.ts` excludes from the global `api`
prefix.
