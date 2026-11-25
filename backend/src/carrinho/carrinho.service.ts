import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { dinheiro } from '../common/util';
import { consolidarItens, toCents, fromCents, type ItemEntrada } from '../domain';

@Injectable()
export class CarrinhoService {
  constructor(private prisma: PrismaService) {}

  /** Recalcula o carrinho com preços e estoque atuais. O navegador nunca define preços. */
  async validar(itens: ItemEntrada[]) {
    let consolidados: ItemEntrada[];
    try {
      consolidados = consolidarItens(itens);
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }
    const produtos = await this.prisma.produto.findMany({ where: { id: { in: consolidados.map((i) => i.produtoId) }, ativo: true } });
    const mapa = new Map(produtos.map((p) => [p.id, p]));
    const avisos: string[] = [];
    const linhas = consolidados.flatMap((i) => {
      const p = mapa.get(i.produtoId);
      if (!p) {
        avisos.push('Um item do carrinho não está mais disponível e foi removido.');
        return [];
      }
      const disponivel = Math.min(i.quantidade, Math.max(0, p.estoqueAtual));
      if (disponivel < i.quantidade) {
        avisos.push(disponivel === 0 ? `"${p.titulo}" está esgotado.` : `Só há ${disponivel} unidade(s) de "${p.titulo}".`);
      }
      const precoCents = toCents(p.preco);
      return [{
        produtoId: p.id,
        titulo: p.titulo,
        autor: p.autor,
        slug: p.slug,
        imagem: p.imagem,
        precoUnitario: dinheiro(p.preco),
        quantidade: i.quantidade,
        quantidadeDisponivel: disponivel,
        disponivel: disponivel >= i.quantidade,
        subtotal: fromCents(precoCents * i.quantidade),
      }];
    });
    const subtotal = fromCents(linhas.reduce((s, l) => s + toCents(l.precoUnitario) * l.quantidade, 0));
    return { linhas, subtotal, avisos, podeFinalizar: linhas.length > 0 && linhas.every((l) => l.disponivel) };
  }

  async obter(usuarioId: number) {
    const c = await this.prisma.carrinho.findUnique({ where: { usuarioId }, include: { itens: true } });
    return { itens: (c?.itens ?? []).map((i) => ({ produtoId: i.produtoId, quantidade: i.quantidade })) };
  }

  async salvar(usuarioId: number, itens: ItemEntrada[]) {
    const unicos = [...new Map(itens.map((i) => [i.produtoId, i])).values()];
    const validos = await this.prisma.produto.findMany({ where: { id: { in: unicos.map((i) => i.produtoId) }, ativo: true }, select: { id: true } });
    const ok = new Set(validos.map((p) => p.id));
    const final = unicos.filter((i) => ok.has(i.produtoId));
    await this.prisma.$transaction(async (tx) => {
      const c = await tx.carrinho.upsert({ where: { usuarioId }, update: {}, create: { usuarioId } });
      await tx.itemCarrinho.deleteMany({ where: { carrinhoId: c.id } });
      if (final.length) await tx.itemCarrinho.createMany({ data: final.map((i) => ({ carrinhoId: c.id, produtoId: i.produtoId, quantidade: i.quantidade })) });
    });
    return { itens: final };
  }
}
