import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log:
        process.env.NODE_ENV === 'development'
          ? ['query', 'warn', 'error']
          : ['warn', 'error'],
    });
  }

  /**
   * Eager connect, but NOT fatal.
   *
   * `await this.$connect()` used to be unguarded, which made every database
   * problem — a wrong DATABASE_URL, a Neon project still waking up, a network
   * blip on a cold start — an unhandled rejection during Nest's init phase.
   * That kills the whole function, so `/health` (whose entire job is to report
   * that the database is down) returned a platform 500 instead of its own
   * `{ status: 'degraded' }` body, and the log said nothing useful.
   *
   * Prisma connects lazily on the first query anyway, so swallowing this costs
   * nothing: a genuinely unreachable database still surfaces, per request, as
   * that request's own error.
   */
  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
    } catch (error) {
      this.logger.error(
        'Could not connect to the database at startup — the API will keep serving ' +
          'and retry on the first query. Check DATABASE_URL (Neon pooled host, ' +
          '?pgbouncer=true&connection_limit=1) and that the Neon project is not suspended.',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect().catch(() => undefined);
  }
}
