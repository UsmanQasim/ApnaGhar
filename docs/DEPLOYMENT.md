# Deploying Ghar — free tier runbook

Target shape, all on free plans:

| Piece | Host | Free plan reality |
|---|---|---|
| `apps/web` (marketing) | **Vercel** | Static-ish, always fast |
| `apps/admin` (admin panel) | **Vercel** | Server components, always fast |
| `apps/share` (public listing links) | **Vercel** | Always fast |
| `apps/api` (NestJS) | **Render** (Docker) | Sleeps after 15 min idle → ~50s cold start. A keep-alive workflow handles this. |
| Postgres + PostGIS | **Neon** | 0.5 GB, no expiry, PostGIS available |
| Images / media | **Cloudflare R2** | 10 GB storage, no egress fees |
| Video | **Cloudflare Stream** | ⚠️ Not free — leave disabled for the demo |
| `apps/mobile` (Expo) | **Expo Go / EAS** | Not a Vercel thing at all |

> **Why the API is not on Vercel.** `apps/api` is a long-lived Nest server with
> four `@Cron` jobs in `DunningService` (hourly overdue sweeps, daily reminders).
> Vercel functions are ephemeral — they cannot hold a schedule — and Vercel's
> free Hobby plan caps cron jobs at **once per day**. Moving the API there means
> rewriting the scheduler and wrapping Nest in a serverless handler. Render runs
> your code unchanged.

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

## 2. API — Render (15 minutes)

The repo now contains `render.yaml` (a Blueprint) and `apps/api/Dockerfile`.

1. Push to GitHub: `git push origin main`.
2. **render.com** → sign up with GitHub → **New → Blueprint** → pick
   `UsmanQasim/ApnaGhar` → Render reads `render.yaml` and shows one service,
   `ghar-api`, on the free plan in Singapore.
3. Render prompts for every var marked `sync: false`. Fill in:

   | Key | Value |
   |---|---|
   | `DATABASE_URL` | your Neon direct string |
   | `API_BASE_URL` | `https://ghar-api.onrender.com` |
   | `SHARE_BASE_URL` | leave blank for now — you get it in step 3 |
   | `R2_*` | leave blank for now — step 4 |
   | `CF_STREAM_*` | leave blank (Stream is paid) |
   | `MANUAL_EASYPAISA_NUMBER` | your real Easypaisa number |
   | `MANUAL_JAZZCASH_NUMBER` | your real JazzCash number |

   `JWT_SECRET` and `JWT_REFRESH_SECRET` are generated by Render automatically.
   Don't regenerate them later — it logs every user out.

4. Deploy. The first Docker build takes 5–8 minutes.
5. Verify: `https://ghar-api.onrender.com/health` should return
   `{"status":"ok","database":"up",...}`. If `database` says `down`, your
   `DATABASE_URL` is wrong.

**Keep it awake.** `.github/workflows/keep-api-awake.yml` pings `/health` every
10 minutes between 07:00 and 02:00 PKT. Enable it:

> GitHub repo → Settings → Secrets and variables → Actions → **Variables** tab →
> New repository variable → `API_HEALTH_URL` = `https://ghar-api.onrender.com/health`

That costs ~580 of your 750 free instance-hours a month, and — more importantly
— it keeps the dunning crons running. Without it, a sleeping instance runs no
schedules and overdue invoices are never chased.

---

## 3. Frontends — Vercel (20 minutes, three times)

Each `vercel.json` is already in place. Do this **three times**, once per app:

1. **vercel.com** → sign up with GitHub → **Add New → Project** → import
   `ApnaGhar`.
2. **Root Directory** → click *Edit* → choose `apps/web` (then `apps/admin`,
   then `apps/share`).
3. ✅ Turn on **"Include files outside of the Root Directory in the Build Step"**.
   Without this the build cannot see `packages/` and fails on
   `Cannot find module '@ghar/ui'`.
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
| Render free: sleeps after 15 min idle | ~50s cold start; the keep-alive workflow mostly hides this |
| Render free: 750 instance-hours/month/workspace | One always-awake service ≈ 580h with the schedule above. Adding a second free service will blow the budget. |
| Render free: no persistent disk | Fine — all state is in Neon and R2 |
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
- [ ] Move the API off Render free (Render Starter $7/month, or Fly.io ~$5) so
      cold starts and the 750-hour ceiling stop mattering.
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

**`Cannot find module '@ghar/ui'` on Vercel** — "Include files outside of the
Root Directory" is off, or the Root Directory is set to the repo root instead of
`apps/web`.

**`ERR_PNPM_OUTDATED_LOCKFILE`** — `pnpm-lock.yaml` is stale. Run
`pnpm install` locally and commit the lockfile.

**Render build succeeds, service crash-loops** — check Logs. Almost always
either the missing baseline migration (top of this document) or a
`JWT_SECRET` that failed to generate; `app.module.ts` uses `getOrThrow`, so a
missing secret kills boot immediately.

**Admin panel shows 404s everywhere** — `API_BASE_URL` is missing the `/api`
suffix. See the trap in step 3.

**Share links 404** — the opposite: `API_BASE_URL` on the share project has an
`/api` suffix it should not have.

**First request after a quiet night takes a minute** — that's the Render free
tier waking up. Expected.

**Prisma engine errors on Render** — the Dockerfile installs `openssl` and
`libc6-compat` for exactly this. If you change the base image away from
`node:22-alpine`, keep those.
