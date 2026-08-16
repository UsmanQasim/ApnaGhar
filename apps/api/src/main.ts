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

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  app.enableCors({ origin: true, credentials: true });
  app.setGlobalPrefix('api', { exclude: ['s/:token', 'health'] });

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);

  new Logger('Bootstrap').log(`Ghar API listening on :${port}`);
}

void bootstrap();
