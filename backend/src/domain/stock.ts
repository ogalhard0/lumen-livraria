export type StatusEstoque = 'NORMAL' | 'BAIXO' | 'SEM_ESTOQUE';
export type DisponibilidadePublica = 'EM_ESTOQUE' | 'ULTIMAS_UNIDADES' | 'ESGOTADO';

/** Indicador do painel administrativo (normal, baixo, sem estoque). */
export function statusEstoque(atual: number, minimo: number): StatusEstoque {
  if (atual <= 0) return 'SEM_ESTOQUE';
  if (atual <= minimo) return 'BAIXO';
  return 'NORMAL';
}

/** A loja não expõe o saldo exato ao público. */
export function disponibilidadePublica(atual: number): DisponibilidadePublica {
  if (atual <= 0) return 'ESGOTADO';
  if (atual <= 5) return 'ULTIMAS_UNIDADES';
  return 'EM_ESTOQUE';
}
