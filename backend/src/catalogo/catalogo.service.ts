import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';
import { dinheiro, paginar, totalPaginas } from '../common/util';
import { disponibilidadePublica } from '../domain';
import type { ProdutoQuery } from '../schemas';

const incluirCategoria = { categoria: { select: { id: true, nome: true, slug: true } } } satisfies Prisma.ProdutoInclude;
type ProdutoComCategoria = Prisma.ProdutoGetPayload<{ include: typeof incluirCategoria }>;

/** O público nunca recebe o saldo exato de estoque, apenas a disponibilidade. */
export function produtoPublico(p: ProdutoComCategoria) {
  return {
    id: p.id,
    titulo: p.titulo,
    autor: p.autor,
    slug: p.slug,
    preco: dinheiro(p.preco),
    imagem: p.imagem,
    formato: p.formato,
    idioma: p.idioma,
    destaque: p.destaque,
    categoria: p.categoria,
    disponibilidade: disponibilidadePublica(p.estoqueAtual),
  };
}

@Injectable()
export class CatalogoService {
  constructor(private prisma: PrismaService) {}

  async categorias() {
    const todas = await this.prisma.categoria.findMany({ orderBy: [{ ordem: 'asc' }, { nome: 'asc' }] });
    return todas
      .filter((c) => !c.categoriaPaiId)
      .map((c) => ({
        id: c.id,
        nome: c.nome,
        slug: c.slug,
        filhas: todas.filter((f) => f.categoriaPaiId === c.id).map((f) => ({ id: f.id, nome: f.nome, slug: f.slug })),
      }));
  }

  async listar(q: ProdutoQuery) {
    const where: Prisma.ProdutoWhereInput = { ativo: true };
    if (q.categoria) {
      const cat = await this.prisma.categoria.findUnique({ where: { slug: q.categoria }, include: { filhas: { select: { id: true } } } });
      if (!cat) return { itens: [], total: 0, pagina: q.pagina, porPagina: q.porPagina, totalPaginas: 1 };
      where.categoriaId = { in: [cat.id, ...cat.filhas.map((f) => f.id)] };
    }
    if (q.q) where.OR = [{ titulo: { contains: q.q } }, { autor: { contains: q.q } }];
    if (q.precoMin !== undefined || q.precoMax !== undefined) {
      where.preco = { ...(q.precoMin !== undefined ? { gte: q.precoMin } : {}), ...(q.precoMax !== undefined ? { lte: q.precoMax } : {}) };
    }
    if (q.formato) where.formato = q.formato;
    if (q.idioma) where.idioma = q.idioma;
    if (q.destaque) where.destaque = q.destaque === 'true';
    if (q.disponibilidade === 'em_estoque') where.estoqueAtual = { gt: 0 };
    if (q.disponibilidade === 'esgotado') where.estoqueAtual = { lte: 0 };

    const orderBy: Prisma.ProdutoOrderByWithRelationInput[] =
      q.ordem === 'preco_asc' ? [{ preco: 'asc' }] : q.ordem === 'preco_desc' ? [{ preco: 'desc' }] : q.ordem === 'titulo' ? [{ titulo: 'asc' }] : [{ criadoEm: 'desc' }, { id: 'desc' }];

    const [total, itens] = await this.prisma.$transaction([
      this.prisma.produto.count({ where }),
      this.prisma.produto.findMany({ where, orderBy, include: incluirCategoria, ...paginar(q.pagina, q.porPagina) }),
    ]);
    return { itens: itens.map(produtoPublico), total, pagina: q.pagina, porPagina: q.porPagina, totalPaginas: totalPaginas(total, q.porPagina) };
  }

  async detalhe(slug: string) {
    const p = await this.prisma.produto.findFirst({ where: { slug, ativo: true }, include: incluirCategoria });
    if (!p) throw new NotFoundException('Produto não encontrado.');
    const relacionados = await this.prisma.produto.findMany({
      where: { ativo: true, categoriaId: p.categoriaId, id: { not: p.id } },
      include: incluirCategoria,
      take: 4,
      orderBy: { criadoEm: 'desc' },
    });
    return { ...produtoPublico(p), descricao: p.descricao, relacionados: relacionados.map(produtoPublico) };
  }
}
