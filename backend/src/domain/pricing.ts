export const MAX_QTD_ITEM = 20;

export interface ItemEntrada {
  produtoId: number;
  quantidade: number;
}

export function quantidadeValida(q: number): boolean {
  return Number.isInteger(q) && q >= 1 && q <= MAX_QTD_ITEM;
}

/** Une itens repetidos do mesmo produto e valida as quantidades. */
export function consolidarItens(itens: ItemEntrada[]): ItemEntrada[] {
  if (!itens.length) throw new RangeError('O carrinho está vazio');
  const mapa = new Map<number, number>();
  for (const it of itens) {
    if (!Number.isInteger(it.produtoId) || it.produtoId <= 0) throw new RangeError('Produto inválido');
    if (!quantidadeValida(it.quantidade)) throw new RangeError('Quantidade inválida');
    mapa.set(it.produtoId, (mapa.get(it.produtoId) ?? 0) + it.quantidade);
  }
  const saida: ItemEntrada[] = [];
  for (const [produtoId, quantidade] of mapa) {
    if (quantidade > MAX_QTD_ITEM) throw new RangeError(`Limite de ${MAX_QTD_ITEM} unidades por produto`);
    saida.push({ produtoId, quantidade });
  }
  return saida;
}

export interface LinhaPreco {
  precoCents: number;
  quantidade: number;
}

export function calcularTotais(linhas: LinhaPreco[], freteCents: number) {
  if (freteCents < 0) throw new RangeError('Frete inválido');
  const subtotalCents = linhas.reduce((s, l) => s + l.precoCents * l.quantidade, 0);
  return { subtotalCents, freteCents, totalCents: subtotalCents + freteCents };
}
