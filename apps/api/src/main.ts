import 'reflect-metadata';

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';

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

  new Logger('Bootstrap').log(`Ghar API listening on :${port}`);
}

void bootstrap();
