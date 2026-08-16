import { BadRequestException, Injectable, type PipeTransform } from '@nestjs/common';
import type { ZodSchema } from 'zod';

/**
 * Validates with the SAME zod schemas the mobile app uses (@ghar/shared).
 * One definition of "a valid listing" for both sides — the client can't submit
 * something the server considers malformed, and the server can't quietly
 * tighten a rule the client doesn't know about.
 *
 * Errors come back as field → message-key pairs, never prose. The app resolves
 * them through i18n, so a validation failure is readable in Urdu.
 */
@Injectable()
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodSchema<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (result.success) return result.data;

    throw new BadRequestException({
      code: 'validation_failed',
      fields: result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
  }
}

/** `@Body(zodBody(createPropertySchema)) input: CreateProperty` */
export const zodBody = <T>(schema: ZodSchema<T>): ZodValidationPipe<T> =>
  new ZodValidationPipe(schema);
