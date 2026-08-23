# Deploying Ghar — free tier runbook

Target shape, all on free plans:

| Piece | Host | Free plan reality |
|---|---|---|
| `apps/web` (marketing) | **Vercel** | Static-ish, always fast |
| `apps/admin` (admin panel) | **Vercel** | Server components, always fast |
| `apps/share` (public listing links) | **Vercel** | Always fast |
| `apps/api` (NestJS) | **Vercel** (serverless) | Same account as the frontends. No card, no expiry. |
| Postgres + PostGIS | **Neon** | 0.5 GB, no expiry, PostGIS available, no card. Also holds OTP codes. |

| Images / media | **Cloudflare R2** | 10 GB storage, no egress fees |
| Video | **Cloudflare Stream** | ⚠️ Not free — leave disabled for the demo |
| `apps/mobile` (Expo) | **Expo Go / EAS** | Not a Vercel thing at all |

> **Why this took four attempts.** The API originally needed three things that
> only paid hosting provides: a process that stays alive, a Redis instance, and
> an in-process scheduler. Render wanted a card, Koyeb's free tier was
> discontinued when Mistral acquired them, and Railway's is a 30-day trial.
> Rather than keep hunting for a host, the three requirements were removed. The
> app is simpler for it — one platform, one database, one bill when there
> eventually is one.

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

## 2. API — Vercel (20 minutes)

Everything runs on **one platform, one account, no card, no trial, no clock**.
The API is now a Vercel project like the other three.

Getting here needed three changes to `apps/api`, all already committed:

| What forced paid hosting | What replaced it |
|---|---|
| Redis, for OTP codes | an `otp_codes` table in Neon — see migration `0002_otp_codes` |
| An always-on process | `src/serverless.ts` + `api/index.js` — Nest built once per cold start and cached |
| `@nestjs/schedule` in-process crons | `POST /api/maintenance/run`, called by GitHub Actions |

`ioredis`, `bullmq` and `@nestjs/schedule` are gone from `package.json`. BullMQ
was never actually wired up in `app.module.ts` — no queue was ever created — so
nothing was lost with it.

### 2a. Repoint the database at Neon's pooler

A serverless function can be a fresh process per request, and direct
connections would exhaust Postgres's connection limit. `schema.prisma` now
declares two URLs:

- `DATABASE_URL` — the **pooled** host (contains `-pooler`), with
  `?pgbouncer=true&connection_limit=1` appended. What the deployed functions use.
- `DIRECT_URL` — the **direct** host. Migrations only; PgBouncer cannot run the
  DDL transactions they need.

Both live in `apps/api/.env.neon` for local use. Neon's dashboard gives you both
strings — the "Pooled connection" toggle switches between them.

### 2b. Apply the new migration

```
powershell -ExecutionPolicy Bypass -File scripts\deploy-db.ps1
```

This adds the `otp_codes` table. Safe to re-run — `migrate deploy` skips what is
already applied.

### 2c. Create the Vercel project

Same flow as the other three, a fourth time:

1. **Add New → Project** → import `ApnaGhar`
2. **Root Directory** → `apps/api`
3. **Framework Preset** → **Other**. Vercel will otherwise try to detect a
   frontend and fail. `apps/api/vercel.json` supplies the build, install and
   rewrite rules.
4. Environment variables → paste the block from
   [`docs/api-env-vars.md`](./api-env-vars.md)
5. Deploy, then check `https://<api>.vercel.app/health`

> **Expect the first request after idle to take a second or two.** A cold start
> boots the Nest DI graph and connects Prisma. Warm requests are fast, and the
> app caches the initialised Express instance at module scope so the cost is
> paid per container, not per request.

### 2d. Wire up the schedule

`.github/workflows/api-cron.yml` calls the maintenance endpoint hourly, and
once a day at 05:00 UTC with the daily steps too (reminders and dormancy send
SMS, so they must not run hourly).

1. Generate a secret:
   ```powershell
   [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Max 256 }))
   ```
2. Vercel → API project → Settings → Environment Variables → `CRON_SECRET` →
   **redeploy**
3. GitHub → repo Settings → Secrets and variables → Actions:
   - **Secrets** tab → `CRON_SECRET` = the same value
   - **Variables** tab → `API_BASE_URL` = `https://<api>.vercel.app`
4. Actions tab → *API maintenance* → **Run workflow** to test it

The URL is a variable and the secret is a secret on purpose — variables are
printed in run logs.

If `CRON_SECRET` is unset on the server the endpoint returns 401 rather than
running. It fails closed: an unset secret must never mean an open endpoint that
anyone can use to hammer your database.

### 2e. Point the frontends at it

| Vercel project | Key | Value |
|---|---|---|
| `apps/admin` | `API_BASE_URL` | `https://<api>.vercel.app/api` |
| `apps/share` | `API_BASE_URL` | `https://<api>.vercel.app` |

Redeploy both — Vercel bakes environment variables in at build time.

### What this costs

Nothing, indefinitely. Vercel Hobby covers 1,000,000 function invocations a
month; GitHub Actions schedules are free on public and private repos; Neon and
R2 free tiers have no expiry.

The one future cost is unchanged and unrelated to hosting: **Vercel Hobby is
non-commercial use only.** When you start charging agents, all four projects
move to a Pro team — $20/month total, not per project. Nothing about the
architecture changes.

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
| Vercel Hobby: 1,000,000 function invocations/month | Not a limit a demo reaches |
| Vercel functions: cold start after idle | ~1-2s on the first request; warm requests are unaffected |
| GitHub Actions: schedules pause after 60 days without a commit | The billing sweeps would stop silently. Push something, or use cron-job.org |
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
- [ ] Move all four Vercel projects to a **Pro team** ($20/month total). This
      is the same item as the Hobby non-commercial rule above, not a separate
      cost.
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

**API function returns 500 on every route** — a missing boot-critical env var.
`DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET` and `JWT_REFRESH_SECRET` are read
with `getOrThrow` during startup, so Nest fails to initialise and every request
fails identically. Check the function log for `getOrThrow`.

**`Query engine library for current platform not found`** — `prisma generate`
ran without the RHEL binary target. `schema.prisma` sets
`binaryTargets = ["native", "rhel-openssl-3.0.x"]` for exactly this; if you
edited that line, put it back and redeploy.

**`Nest can't resolve dependencies of …` only in production** — something is
importing TypeScript into the Vercel function directly. `api/index.js` must stay
JavaScript and must require `../dist/…`: Vercel compiles this directory with
esbuild, which silently drops `emitDecoratorMetadata`, and Nest's DI is built
entirely on that metadata.

**Billing sweeps never run** — check the Actions tab. Either `CRON_SECRET`
differs between Vercel and the GitHub secret (the endpoint returns 401), or
GitHub paused the schedule after 60 days without a commit.
