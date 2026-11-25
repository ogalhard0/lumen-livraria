/** Valores monetários são tratados em centavos (inteiros) para evitar erros de ponto flutuante. */
export type Cents = number;

export function toCents(v: number | string | { toString(): string }): Cents {
  const n = typeof v === 'number' ? v : Number(v.toString());
  if (!Number.isFinite(n)) throw new Error('Valor monetário inválido');
  return Math.round(n * 100);
}

export function fromCents(c: Cents): number {
  return Math.round(c) / 100;
}

export function formatBRL(c: Cents): string {
  return (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
