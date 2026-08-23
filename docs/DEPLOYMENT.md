# Deploying Ghar — free tier runbook

Target shape, all on free plans:

| Piece | Host | Free plan reality |
|---|---|---|
| `apps/web` (marketing) | **Vercel** | Static-ish, always fast |
| `apps/admin` (admin panel) | **Vercel** | Server components, always fast |
| `apps/share` (public listing links) | **Vercel** | Always fast |
| `apps/api` (NestJS) | **Koyeb** (Docker) | No card needed. Sleeps after 1h idle; a keep-alive workflow handles this. |
| Postgres + PostGIS | **Neon** | 0.5 GB, no expiry, PostGIS available, no card |
| Redis (OTP only) | **Upstash** | 500k commands/month, no card |
| Images / media | **Cloudflare R2** | 10 GB storage, no egress fees |
| Video | **Cloudflare Stream** | ⚠️ Not free — leave disabled for the demo |
| `apps/mobile` (Expo) | **Expo Go / EAS** | Not a Vercel thing at all |

> **Why the API is not on Vercel.** `apps/api` is a long-lived Nest server with
> four `@Cron` jobs in `DunningService` (hourly overdue sweeps, daily reminders).
> Vercel functions are ephemeral — they cannot hold a schedule — and Vercel's
> free Hobby plan caps cron jobs at **once per day**. Moving the API there means
> rewriting the scheduler and wrapping Nest in a serverless handler. A container
> host runs your code unchanged.

---

## ⛔ Do this before anything else: the missing baseline migration

`apps/api/prisma/migrations/` contains exactly one migration,
`0001_postgis_and_search`, and it is a hand-written companion — its own first
line says *"Run after `prisma migrate dev`"*. It creates indexes on tables like
`properties` but **never creates the tables**.

Against a fresh Neon database, `prisma migrate deploy` will therefore fail with
`relation "properties" does not exist`, and the API will crash-loop on boot.

Generate the baseline once. From the repo root in **PowerShell**:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\create-baseline-migration.ps1
```

That script is in `scripts/`. It runs `prisma migrate diff` against your schema,
writes `0000_init/migration.sql` plus `migration_lock.toml` as UTF-8 without a
BOM (PowerShell's `>` operator writes UTF-16, which Prisma cannot parse), and
refuses to write anything if the generated SQL has no `CREATE TABLE` in it.

If you would rather run it by hand, note that `prisma` is not a global command —
it lives in the workspace, so it has to go through `pnpm --filter`. In **CMD**,
one line each, no backslash continuations:

```bat
mkdir apps\api\prisma\migrations\0000_init
pnpm --filter @ghar/api exec prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > apps\api\prisma\migrations\0000_init\migration.sql
> apps\api\prisma\migrations\migration_lock.toml echo provider = "postgresql"
```

Check that `0000_init/migration.sql` opens with `CREATE TYPE` / `CREATE TABLE`
statements and is a few hundred lines long. `0000_` sorts before `0001_`, so
Prisma applies the tables first and the PostGIS indexes second — which is the
order the second file assumes.

Commit both files.

---

## 1. Database — Neon (10 minutes)

1. Sign up at **neon.tech** with GitHub. Free plan, no card.
2. Create a project: name `ghar`, Postgres **16**, region **Singapore**
   (`ap-southeast-1`) — the closest Neon region to Pakistan.
3. Copy the connection string from the dashboard. Take the **direct** one, *not*
   the `-pooler` one:
   ```
   postgresql://USER:PASS@ep-xxxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   ```
   The API is one long-running server, so it wants a real persistent connection.
   The pooler only matters if you later move to serverless.
4. Nothing else to configure — PostGIS, `pg_trgm` and `uuid-ossp` are all
   available on the free plan, and your `0001` migration enables them itself.

**Apply the schema and seed, from your laptop:**

The Neon connection string is already saved to `apps/api/.env.neon` (gitignored).
Run:

```
powershell -ExecutionPolicy Bypass -File scripts\deploy-db.ps1
```

That generates the Prisma client, builds the workspace packages the seed needs,
applies `0000_init` then `0001_postgis_and_search`, and seeds plans, localities
and one demo agent. It is safe to re-run — `migrate deploy` skips migrations the
database already has, and the seed upserts.

Two details it handles that a hand-typed command would not:

- It sets `NODE_ENV=development`. `prisma/seed.ts` hides the demo agent behind
  `process.env.NODE_ENV !== 'production'`, and you want that agent to test the
  create-listing flow.
- The credentials live in `.env.neon`, **not** `.env`. Prisma auto-loads `.env`
  from `apps/api/`, so a stray `prisma migrate dev` or `prisma migrate reset`
  would silently target the live database and drop every table. The different
  filename makes that impossible; the script passes the value in explicitly.

If `migrate deploy` succeeds here, Render will succeed too.

> Every Prisma command in this repo goes through `pnpm --filter @ghar/api exec`.
> A bare `prisma ...` fails with *'prisma' is not recognized* because it is a
> workspace dev-dependency, not a global install. And `pnpm run prisma` from the
> repo root fails too — that script lives in `apps/api/package.json`, not the
> root one.

---

## 2. API — Koyeb + Upstash, no card (20 minutes)

> **Render now asks for a credit card**, including on its free plan. Several
> comparison sites still say otherwise; the signup screen is the authority. The
> `render.yaml` in this repo stays valid — use it the day you have a card — but
> the primary path below needs no payment method at all.

Two pieces, because Koyeb's free tier is one web service and does not include
Redis:

| Piece | Host | Card? |
|---|---|---|
| NestJS API (Docker) | **Koyeb** free instance | No\* |
| Redis (OTP codes only) | **Upstash** free | No |

\* Koyeb asks for a card only when it cannot verify automatically that you are
human. If it does ask, jump to *Fallbacks* at the end of this section.

### 2a. Redis first — Upstash

The API cannot boot without it. `OtpService`'s **constructor** calls
`config.getOrThrow('REDIS_URL')`, so a missing value is not a broken endpoint,
it is a container that never starts.

1. **console.upstash.com** → sign up with GitHub.
2. Create Database → name `ghar-otp` → **Regional**, region **ap-southeast-1
   (Singapore)** → Free plan.
3. Copy the **connection string** from the Redis tab — the `rediss://…` one, not
   the REST URL. It looks like:
   ```
   rediss://default:PASSWORD@apn1-xxxx-12345.upstash.io:6379
   ```
   `ioredis` (what `OtpService` uses) speaks the native protocol and enables TLS
   automatically from the `rediss://` scheme. The REST URL will not work here.

Free plan is 500,000 commands/month. OTP login uses about 4 commands per
sign-in, so that is not a limit you will reach during a demo.

### 2b. The API — Koyeb

1. Push to GitHub first: `git push origin main`.
2. **koyeb.com** → sign up with GitHub → **Create Web Service** → **GitHub** →
   pick `UsmanQasim/ApnaGhar`, branch `main`.
3. Builder → **Dockerfile**.
   - Dockerfile location: `apps/api/Dockerfile`
   - Work directory / build context: leave at the repository root. The image
     needs `packages/` for `@ghar/shared` and `@ghar/i18n`, so a context of
     `apps/api` will fail.
4. Instance → **Free**. Region: Frankfurt or Washington — the free instance runs
   nowhere else. Frankfurt is ~130ms from Pakistan, which is fine for a demo.
5. Exposed port **3000**, path `/`. Health check path `/health`.
6. Environment variables — see the full table in
   [`docs/api-env-vars.md`](./api-env-vars.md). Paste that in, then fill the
   blanks.
7. Deploy. First Docker build takes 5–10 minutes on a free builder.
8. Verify `https://<your-app>-<org>.koyeb.app/health` returns
   `{"status":"ok","database":"up",…}`. `database: "down"` means `DATABASE_URL`
   is wrong; a container that never starts usually means `REDIS_URL` is missing.

**Generate the two JWT secrets yourself** — Koyeb has no equivalent of Render's
`generateValue`. In PowerShell:

```powershell
[Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Max 256 }))
```

Run it twice, once for `JWT_SECRET` and once for `JWT_REFRESH_SECRET`. Keep them
stable — rotating either logs every user out.

### 2c. Keep it awake

Koyeb's free instance scales to zero after **1 hour** without traffic, and a
sleeping process runs no `@Cron` jobs — so overdue invoices would never be
chased. `.github/workflows/keep-api-awake.yml` pings `/health` every 10 minutes
between 07:00 and 02:00 PKT. Enable it:

> GitHub repo → Settings → Secrets and variables → Actions → **Variables** tab →
> New repository variable → `API_HEALTH_URL` = your `/health` URL

Unlike Render, Koyeb's free instance has no monthly hour budget to burn, so you
can widen the schedule to `*/10 * * * *` if you want it always up.

### Fallbacks, if Koyeb asks for a card too

1. **Hugging Face Spaces** — Docker Spaces, free, no card, never asks. Needs a
   `Dockerfile` at the repo root and the app listening on port 7860, so it costs
   one small config change. Sleeps after 48h idle rather than 1h.
2. **Railway** — no card, and the best experience of the lot *while it lasts*.
   $5 of one-time credit over 30 days (GitHub-verified accounts get unrestricted
   networking; unverified ones get limited ports). 1 GB RAM, no sleep, a
   Southeast Asia region, and Redis is just another service in the same project
   — so no Upstash and no cold starts.

   The catch is the end of it. When the $5 or the 30 days runs out, whichever
   comes first, the account drops to the Free plan: **$1 of usage credit per
   month, no rollover**. An always-on Nest container costs several times that,
   so the API stops. Railway also deletes trial volumes 30 days after credits
   expire.

   Reasonable use: run the demo on Railway for a month, and treat the Docker
   image as portable — moving to Koyeb later is re-pointing environment
   variables, not a rewrite.

3. **Move the API onto Vercel.** You already have a working card-free Vercel
   account. This is the most work: Nest needs a serverless handler wrapper, the
   four `@Cron` jobs must become HTTP endpoints driven by GitHub Actions (Vercel
   Hobby cron only fires once a day), and Prisma must switch to Neon's
   `-pooler` connection string with `?pgbouncer=true&connection_limit=1`. Ask
   before starting — it is a few hours, not minutes.
4. **Render**, unchanged, the day a card is available — `render.yaml` already
   provisions both the API and a free Key Value instance, so Upstash would no
   longer be needed. Render is the better host of the two if you can use it:
   Singapore region (~90ms from Pakistan vs Frankfurt's ~130ms) and one
   blueprint instead of two dashboards.

   **Does adding a card start charging you?** No — a payment method does not
   upgrade a service or open a subscription. Free instances stay free. What it
   changes is the failure mode on two overages:

   | Overage | No card | Card on file |
   |---|---|---|
   | 750 instance-hours/month | services suspend until next month | **same** — suspend, never billed |
   | Outbound bandwidth above the free allowance | suspend for the rest of the month | billed as overage |
   | Build pipeline minutes | builds stop | billed as overage |

   So the card turns "it stops" into "a small charge" for bandwidth and build
   minutes only. For this app, bandwidth is negligible — the API serves JSON,
   and images come from R2, which never touches the API host. Build minutes are
   the one to watch: every push to `main` rebuilds the Docker image, and Docker
   builds are not fast. Set a spend limit in Billing before you deploy, and
   check what the lowest allowed value is on a free workspace.

---

## 3. Frontends — Vercel (20 minutes, three times)

Each `vercel.json` is already in place. Do this **three times**, once per app:

1. **vercel.com** → sign up with GitHub → **Add New → Project** → import
   `ApnaGhar`.
2. **Root Directory** → click *Edit* → choose `apps/web` (then `apps/admin`,
   then `apps/share`).
3. There is **no toggle to hunt for.** Older guides tell you to enable "Include
   source files outside of the Root Directory in the Build Step" — that option is
   no longer shown because Vercel enables it by default on every project created
   since 27 August 2020. Your build can already see `packages/`, and the
   `cd ../..` in the build command is supported (Vercel's own Turborepo docs use
   the same pattern).
4. Leave Build/Install commands alone — `vercel.json` overrides them. They filter
   the pnpm install to just that app's dependency subtree, so Expo and React
   Native never get installed and builds stay under 2 minutes.
5. Add environment variables (Production + Preview):

   | Project | Key | Value |
   |---|---|---|
   | `apps/admin` | `API_BASE_URL` | `https://ghar-api.onrender.com/api` |
   | `apps/share` | `API_BASE_URL` | `https://ghar-api.onrender.com` |
   | `apps/web` | `CONTACT_WEBHOOK_URL` | optional — a Slack/Discord webhook |

   > ⚠️ **The trap.** Both apps read a variable with the *same name* but expect
   > *different values*. `apps/admin/src/api.ts` appends paths like
   > `/admin/agents/...` and needs the `/api` prefix baked in.
   > `apps/share` fetches `/s/:token`, which `main.ts` explicitly **excludes**
   > from the global `api` prefix — so it must have no suffix. Get this backwards
   > and you get 404s that look like auth failures.

6. Deploy. Note the three URLs, e.g. `ghar-share.vercel.app`.
7. Go back to Render → `ghar-api` → Environment → set
   `SHARE_BASE_URL=https://ghar-share.vercel.app` → save (this redeploys).

---

## 4. Media — Cloudflare R2 (10 minutes)

Free: 10 GB storage, 1M writes/month, **zero egress fees** (the reason to pick
R2 over S3 for an image-heavy property app).

1. **dash.cloudflare.com** → R2 → *Create bucket* → `ghar-media`.
2. Settings → **Public access** → enable `r2.dev` subdomain (fine for a demo;
   attach a real domain before launch).
3. Manage R2 API Tokens → *Create API token* → **Object Read & Write** scoped to
   `ghar-media`. Copy the Access Key ID and Secret — the secret is shown once.
4. Back on Render, fill in:

   | Key | Value |
   |---|---|
   | `R2_ACCOUNT_ID` | from the R2 overview page |
   | `R2_ENDPOINT` | `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` |
   | `R2_ACCESS_KEY_ID` | from step 3 |
   | `R2_SECRET_ACCESS_KEY` | from step 3 |
   | `R2_BUCKET` | `ghar-media` |
   | `R2_PUBLIC_BASE_URL` | the `https://pub-xxxx.r2.dev` URL from step 2 |

**Video is not free.** Cloudflare Stream starts at $5/month per 1,000 minutes
stored. Leave `CF_STREAM_*` blank; video upload will fail cleanly and everything
else works.

---

## 5. Mobile — Expo

Not a Vercel deployment. For a demo:

```bash
pnpm --filter @ghar/mobile exec expo start
```

Point `apps/mobile` at the live API (`app.json` → `extra`, or an
`EXPO_PUBLIC_API_URL`), scan the QR with Expo Go, done. Real store builds go
through EAS later — that has its own free-tier queue.

---

## What "free" actually costs you

| Limit | Effect |
|---|---|
| Koyeb free: scales to zero after 1h idle | Cold start on the next request; the keep-alive workflow mostly hides this |
| Koyeb free: one web service, Frankfurt or Washington only | ~130ms from Pakistan. Fine for a demo, worth moving closer at launch |
| Koyeb free: 512 MB RAM, 0.1 vCPU | Enough for Nest + Prisma, but boots slowly |
| Upstash free: 500k commands/month | OTP login is ~4 commands per sign-in |
| Neon free: 0.5 GB storage | Thousands of listings. Media is in R2, not the DB. |
| Neon free: scale-to-zero | ~500ms wake on first query. Invisible in practice. |
| Vercel Hobby: 100 GB bandwidth | Plenty for a demo |
| GitHub Actions: schedules pause after 60 days of no commits | Use cron-job.org instead if the repo goes quiet |

---

## Before you take real money — the launch checklist

These are not optional at launch, only during the demo:

- [ ] **Vercel Hobby is non-commercial only.** Vercel's fair-use policy
      restricts Hobby to "non-commercial, personal use." A marketplace charging
      agents Rs 100–1,000/month via JazzCash is commercial. Move the three
      projects to a **Pro team ($20/month total, not per project)** before you
      onboard a paying agent.
- [ ] `OTP_DEV_MODE=false` and a real Pakistani SMS aggregator wired into
      `SMS_PROVIDER` / `SMS_API_KEY`. Right now the OTP is `123456` and is
      returned in the API response — anyone can log in as anyone.
- [ ] Move the API off a free instance (Koyeb Starter, Render Starter $7/month,
      or Fly.io ~$5) so cold starts stop mattering, and pick a region closer to
      Pakistan than Frankfurt.
- [ ] `JAZZCASH_ENABLED=true` with real merchant credentials, and
      `JAZZCASH_RETURN_URL` pointing at the live API.
- [ ] Lock down CORS. `main.ts` currently does `origin: true`, which reflects
      any origin. Replace with your three real domains.
- [ ] A real domain on R2 instead of `r2.dev`.
- [ ] `SENTRY_DSN` set — free tier covers 5k errors/month.
- [ ] Neon: turn on point-in-time restore (paid) or schedule `pg_dump`. The
      `ledger_entries` table is your money audit trail and is append-only by
      trigger; losing it is unrecoverable.

---

## Troubleshooting

**`Cannot find module '@ghar/ui'` on Vercel** — the Root Directory is wrong.
It must be `apps/web` / `apps/admin` / `apps/share`, not the repo root. (This is
*not* the old "include files outside the Root Directory" setting — that is on by
default now and no longer displayed.) If the Root Directory is right, check that
the install actually ran from the repo root: the build log should show
`cd ../.. && pnpm install`, and `packages/ui/dist` must exist before `next build`
starts.

**`ERR_PNPM_OUTDATED_LOCKFILE`** — `pnpm-lock.yaml` is stale. Run
`pnpm install` locally and commit the lockfile.

**Build succeeds, service crash-loops** — check the logs. Almost always either
the missing baseline migration (top of this document) or a missing boot-critical
env var; `app.module.ts` and `OtpService` both use `getOrThrow`, so a missing
secret or Redis URL kills boot immediately.

**Admin panel shows 404s everywhere** — `API_BASE_URL` is missing the `/api`
suffix. See the trap in step 3.

**Share links 404** — the opposite: `API_BASE_URL` on the share project has an
`/api` suffix it should not have.

**First request after a quiet night takes a minute** — that's the Render free
tier waking up. Expected.

**Prisma engine errors on the API host** — the Dockerfile installs `openssl` and
`libc6-compat` for exactly this. If you change the base image away from
`node:22-alpine`, keep those.

**Container starts then immediately exits, no useful log** — a missing
boot-critical env var. `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET` and
`JWT_REFRESH_SECRET` are read with `getOrThrow` during startup. See
[`docs/api-env-vars.md`](./api-env-vars.md).
