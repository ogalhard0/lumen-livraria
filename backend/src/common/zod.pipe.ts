import { BadRequestException, PipeTransform } from '@nestjs/common';
import type { ZodTypeAny, z } from 'zod';

export class ZodPipe<T extends ZodTypeAny> implements PipeTransform<unknown, z.infer<T>> {
  constructor(private schema: T) {}

  transform(valor: unknown): z.infer<T> {
    const r = this.schema.safeParse(valor);
    if (!r.success) {
      throw new BadRequestException({
        mensagem: 'Dados inválidos',
        erros: r.error.issues.map((i) => ({ campo: i.path.join('.'), mensagem: i.message })),
      });
    }
    return r.data;
  }
}
