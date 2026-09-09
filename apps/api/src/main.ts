import 'reflect-metadata';

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { assertBootEnv } from './common/env.check';

// Prisma returns BigInt for every money column. Express's JSON serializer
// throws on BigInt, so teach it to emit a string — the client parses paisa as
// a string and converts to Number only for display, never for arithmetic.
(BigInt.prototype as unknown as { toJSON: () => string }).toJSON = function toJSON() {
  return this.toString();
};

/**
 * The one entry point, locally and in production.
 *
 * Vercel detects `src/main.ts` and turns this whole app into a single Vercel
 * Function on Fluid compute — no serverless handler to write, no Express
 * instance to export, no rewrites. `app.listen()` is exactly right: the
 * platform runs the real server rather than invoking a per-request handler.
 *
 * (An earlier version of this deployment hand-rolled that wrapper in
 * src/serverless.ts and api/index.js. Both are deleted — Vercel's native NestJS
 * support does the same job with none of the moving parts.)
 */
async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');

  // Before NestFactory, not after: a missing JWT_SECRET throws deep inside
  // JwtModule's async factory, and the platform reports that as an unexplained
  // FUNCTION_INVOCATION_FAILED. This names the variable instead.
  assertBootEnv();

  const app = await NestFactory.create(AppModule, { rawBody: true });

  // TODO before launch: replace `origin: true` (which reflects any origin)
  // with the three real frontend domains.
  app.enableCors({ origin: true, credentials: true });

  // `s/:token` is the public share link and `health` is the uptime probe;
  // neither belongs under /api. The share frontend depends on this — its
  // API_BASE_URL is set WITHOUT the /api suffix for exactly this reason, while
  // the admin panel's has it.
  app.setGlobalPrefix('api', { exclude: ['s/:token', 'health'] });

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);

  logger.log(`Ghar API listening on :${port}`);
}

/**
 * A rejected bootstrap used to leave nothing but the platform's generic 500.
 * Vercel captures stdout/stderr from the function, so printing the real error
 * (and its cause chain) is the difference between a five-minute fix and an
 * afternoon of guessing.
 */
void bootstrap().catch((error: unknown) => {
  const logger = new Logger('Bootstrap');
  logger.error('API failed to start', error instanceof Error ? error.stack : String(error));

  let cause = (error as { cause?: unknown })?.cause;
  while (cause) {
    logger.error(`caused by: ${cause instanceof Error ? cause.stack : String(cause)}`);
    cause = (cause as { cause?: unknown })?.cause;
  }

  // Re-throwing keeps the platform's own failure signal intact; the log above
  // is what makes it diagnosable.
  throw error;
});
