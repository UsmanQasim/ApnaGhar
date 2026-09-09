import { Logger } from '@nestjs/common';

/**
 * Variables without which the Nest module graph cannot be built at all.
 *
 * `JWT_SECRET` is read with `getOrThrow` inside `JwtModule.registerAsync`, so a
 * missing value throws while Nest is still wiring providers — before any route
 * exists, before any logger has run. On Vercel that surfaces as a bare
 * `FUNCTION_INVOCATION_FAILED` 500 on every path including `/health`, with
 * nothing in the runtime log that names the variable.
 *
 * Checking them up front turns that into one readable line.
 */
const BOOT_CRITICAL = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET'] as const;

/**
 * Read by specific endpoints only. Their absence is a feature being off, not a
 * broken deployment, so this warns rather than throws.
 */
const FEATURE_SCOPED = [
  'SHARE_BASE_URL',
  'R2_ENDPOINT',
  'R2_BUCKET',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_PUBLIC_BASE_URL',
  'CRON_SECRET',
] as const;

/**
 * Names every missing variable at once, instead of letting the DI container
 * fail on whichever one it happens to reach first.
 *
 * ── Why this only THROWS on the platform ─────────────────────────────────────
 * It runs before `NestFactory.create`, which is the only place early enough to
 * beat JwtModule's factory — but that is also before `ConfigModule` has read
 * `.env`, so locally `process.env` is legitimately empty at this point and a
 * throw would break `pnpm dev` for no reason. On Vercel there is no `.env`
 * file; the environment IS the whole configuration, so a gap there is real.
 */
export function assertBootEnv(): void {
  const logger = new Logger('Env');

  // Vercel sets VERCEL=1 in every build and runtime environment.
  const onPlatform = Boolean(process.env.VERCEL);

  const missing = BOOT_CRITICAL.filter((key) => !process.env[key]?.trim());
  if (missing.length > 0) {
    const message =
      `Missing required environment variable(s): ${missing.join(', ')}. ` +
      `Set them in the Vercel project (Settings -> Environment Variables, ` +
      `Production scope) and REDEPLOY — Vercel bakes env vars in at build time, ` +
      `so saving one without redeploying changes nothing. See docs/api-env-vars.md.`;

    if (onPlatform) throw new Error(message);

    // Locally these usually arrive from .env a moment later, via ConfigModule.
    logger.debug(`Not yet in process.env before ConfigModule loads: ${missing.join(', ')}`);
    return;
  }

  const degraded = FEATURE_SCOPED.filter((key) => !process.env[key]?.trim());
  if (onPlatform && degraded.length > 0) {
    logger.warn(
      `Unset (the endpoints that use them will fail, the rest of the API is fine): ${degraded.join(', ')}`,
    );
  }

  // The pooled Neon host is not optional on a serverless runtime: each cold
  // invocation can be its own process, and direct connections exhaust
  // Postgres's connection limit long before the traffic does.
  if (onPlatform && !(process.env.DATABASE_URL ?? '').includes('-pooler')) {
    logger.warn(
      'DATABASE_URL does not point at Neon\'s pooled host (no "-pooler" in the ' +
        'hostname). On serverless this exhausts connections under load — use the ' +
        'pooled string with ?pgbouncer=true&connection_limit=1.',
    );
  }
}
