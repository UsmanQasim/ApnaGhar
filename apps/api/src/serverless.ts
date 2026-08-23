import 'reflect-metadata';

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { type Express } from 'express';

import { AppModule } from './app.module';

/**
 * Nest as a serverless function.
 *
 * `main.ts` still exists and is still what runs locally (`pnpm dev:api`) — it
 * calls `app.listen()`, which owns a port for the lifetime of a process. That
 * model has no equivalent on Vercel, where each request may arrive in a fresh
 * container, so this module builds the same app and hands the bare Express
 * instance to the platform instead of listening on anything.
 *
 * Everything that is not `listen()` must stay identical between the two, hence
 * `configure()` below — CORS and the global prefix live in one place so the two
 * entry points cannot drift apart.
 */

// Module-scope cache. Vercel reuses a warm container across invocations, so
// this is what keeps a cold start (Nest DI graph + Prisma connect, ~1-2s) from
// being paid on every single request.
let cached: Express | null = null;

export async function createApp(): Promise<Express> {
  if (cached) return cached;

  const expressApp = express();
  const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp), {
    rawBody: true,
    // The platform captures stdout; Nest's startup banner per cold start is
    // noise in the function logs.
    logger: ['error', 'warn', 'log'],
  });

  configure(app);

  // init(), not listen(). Nest wires everything up and stops short of binding
  // a port — the platform owns the socket.
  await app.init();

  cached = expressApp;
  new Logger('Serverless').log('Nest application initialised');
  return expressApp;
}

/** Shared between the serverless handler and main.ts. */
export function configure(app: {
  enableCors: (options: unknown) => void;
  setGlobalPrefix: (prefix: string, options?: unknown) => void;
}): void {
  // TODO before launch: replace `origin: true` (which reflects any origin) with
  // the three real frontend domains.
  app.enableCors({ origin: true, credentials: true });

  // `s/:token` is the public share link and `health` is the uptime probe;
  // neither should sit under /api. The share frontend depends on this — its
  // API_BASE_URL is set WITHOUT the /api suffix for exactly this reason.
  app.setGlobalPrefix('api', { exclude: ['s/:token', 'health'] });
}
