import 'reflect-metadata';

import { Logger, type INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';

/**
 * Nest as a serverless function.
 *
 * `main.ts` still exists and is still what runs locally (`pnpm dev:api`) — it
 * calls `app.listen()`, which owns a port for the lifetime of a process. That
 * model has no equivalent on Vercel, where each request may arrive in a fresh
 * container, so this module builds the same app and hands the underlying HTTP
 * handler to the platform instead of listening on anything.
 *
 * Everything that is not `listen()` must stay identical between the two, hence
 * `configure()` below — CORS and the global prefix live in one place so the two
 * entry points cannot drift apart.
 */

/**
 * The Express application, which is itself an `(req, res)` handler.
 *
 * Typed structurally rather than as `express.Application` on purpose: Express
 * is a transitive dependency here, pulled in by @nestjs/platform-express, and
 * importing it directly would mean declaring it in package.json and pinning a
 * version that must be kept in step with Nest's.
 */
type HttpHandler = (req: unknown, res: unknown) => void;

// Module-scope cache. Vercel reuses a warm container across invocations, so
// this is what keeps a cold start (Nest DI graph + Prisma connect, ~1-2s) from
// being paid on every single request.
let cached: HttpHandler | null = null;

export async function createApp(): Promise<HttpHandler> {
  if (cached) return cached;

  const app = await NestFactory.create(AppModule, {
    rawBody: true,
    // The platform captures stdout; Nest's startup banner on every cold start
    // is noise in the function logs.
    logger: ['error', 'warn', 'log'],
  });

  configure(app);

  // init(), not listen(). Nest wires everything up and stops short of binding a
  // port — the platform owns the socket.
  await app.init();

  cached = app.getHttpAdapter().getInstance() as HttpHandler;
  new Logger('Serverless').log('Nest application initialised');
  return cached;
}

/**
 * Shared between the serverless handler and main.ts.
 *
 * Takes INestApplication rather than a hand-written structural type: under
 * `strictFunctionTypes`, a parameter typed `unknown` is not compatible with
 * Nest's actual `CorsOptions` parameter, and the assignment fails to compile.
 */
export function configure(app: INestApplication): void {
  // TODO before launch: replace `origin: true` (which reflects any origin) with
  // the three real frontend domains.
  app.enableCors({ origin: true, credentials: true });

  // `s/:token` is the public share link and `health` is the uptime probe;
  // neither should sit under /api. The share frontend depends on this — its
  // API_BASE_URL is set WITHOUT the /api suffix for exactly this reason.
  app.setGlobalPrefix('api', { exclude: ['s/:token', 'health'] });
}
