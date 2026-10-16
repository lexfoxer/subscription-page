import { z } from 'zod';

import { BadRequestException, PipeTransform } from '@nestjs/common';

export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
    constructor(private readonly schema: z.ZodType<T>) {}

    transform(value: unknown): T {
        const result = this.schema.safeParse(value);

        if (!result.success) {
            throw new BadRequestException({
                code: 'VALIDATION_ERROR',
                message: result.error.issues
                    .map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`)
                    .join('; '),
            });
        }

        return result.data;
    }
}
