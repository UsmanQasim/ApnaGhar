# ─────────────────────────────────────────────────────────────────────────────
# Ghar API — container image for Render (or any Docker host).
#
# Built from the REPO ROOT, not from apps/api, because the API depends on
# @ghar/shared and @ghar/i18n through the pnpm workspace. Render is told this
# via `dockerContext: .` in render.yaml.
#
# Single stage on purpose: a two-stage prune saves ~200 MB of image but adds a
# second `prisma generate` and a class of "works locally, breaks in prod"
# failures that are not worth it for a free-tier demo.
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine

# openssl: required by Prisma's query engine on Alpine.
# libc6-compat: glibc shim the engine binary expects.
RUN apk add --no-cache openssl libc6-compat

RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

WORKDIR /repo

# The whole repo is copied (minus .dockerignore) so pnpm can see every
# workspace manifest — with any of them missing, --frozen-lockfile fails.
COPY . .

# --filter "@ghar/api..." installs the API and its workspace dependencies only.
# Expo, Next and the mobile toolchain never enter the image.
RUN pnpm install --frozen-lockfile --filter "@ghar/api..."

# Prisma client must be generated before `nest build` typechecks against it.
RUN pnpm --filter @ghar/api exec prisma generate

# Builds @ghar/shared → @ghar/i18n → @ghar/api in topological order.
RUN pnpm --filter "@ghar/api..." run build

ENV NODE_ENV=production
# Render injects its own PORT; this is the fallback for `docker run` locally.
ENV PORT=3000
EXPOSE 3000

WORKDIR /repo/apps/api

# Migrations run on every boot. `migrate deploy` is idempotent — it applies
# only migrations the database has not seen — so a restart is safe.
CMD ["sh", "-c", "pnpm exec prisma migrate deploy && node dist/main.js"]
