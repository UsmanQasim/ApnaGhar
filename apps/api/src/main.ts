import 'reflect-metadata';

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { configure } from './serverless';

// Prisma returns BigInt for every money column. Express's JSON serializer
// throws on BigInt, so teach it to emit a string — the client parses paisa as
// a string and converts to Number only for display, never for arithmetic.
(BigInt.prototype as unknown as { toJSON: () => string }).toJSON = function toJSON() {
  return this.toString();
};

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  // Shared with the serverless entry point so the two cannot drift — a CORS
  // rule or prefix change made in one place must not silently apply to local
  // development only.
  configure(app);

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);

  new Logger('Bootstrap').log(`Ghar API listening on :${port}`);
}

void bootstrap();
