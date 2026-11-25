import type { Prisma } from '@prisma/client';

/** Decimal do Prisma -> número com 2 casas (para JSON). */
export const dinheiro = (v: Prisma.Decimal | number | string): number => Math.round(Number(v.toString()) * 100) / 100;

export function paginar(pagina: number, porPagina: number) {
  return { skip: (pagina - 1) * porPagina, take: porPagina };
}

export function totalPaginas(total: number, porPagina: number): number {
  return Math.max(1, Math.ceil(total / porPagina));
}
