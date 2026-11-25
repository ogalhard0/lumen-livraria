import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../common/audit.service';
import { dinheiro, paginar, totalPaginas } from '../common/util';
import { MailService } from '../mail/mail.service';
import { incluirPedido, mapPedido, PedidosService, STATUS_CANCELAVEIS } from '../pedidos/pedidos.service';
import { podeTransicionar, proximosStatus, ROTULO_CLIENTE, slugify, statusEstoque } from '../domain';
import type { BannerInput, ProdutoAdminInput } from '../schemas';

type Q = Record<string, any>;

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private mail: MailService,
    private pedidos: PedidosService,
  ) {}

  // ---------- Painel ----------
  async resumo() {
    const inicio = new Date();
    inicio.setHours(0, 0, 0, 0);
    const [pedidosHoje, vendas, porStatus, estoque, semEstoque, baixoRaw, recentes, criticoRaw] = await Promise.all([
      this.prisma.pedido.count({ where: { criadoEm: { gte: inicio }, status: { not: 'CANCELADO' } } }),
      this.prisma.pedido.aggregate({ _sum: { total: true }, where: { criadoEm: { gte: inicio }, status: { in: ['PAGO', 'EM_SEPARACAO', 'ENVIADO', 'PRONTO_RETIRADA', 'CONCLUIDO'] } } }),
      this.prisma.pedido.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.produto.aggregate({ _sum: { estoqueAtual: true }, where: { ativo: true } }),
      this.prisma.produto.count({ where: { ativo: true, estoqueAtual: { lte: 0 } } }),
      this.prisma.$queryRaw<{ n: bigint }[]>(Prisma.sql`SELECT COUNT(*) AS n FROM produtos WHERE ativo = 1 AND estoqueAtual > 0 AND estoqueAtual <= estoqueMinimo`),
      this.prisma.pedido.findMany({ orderBy: { criadoEm: 'desc' }, take: 5, include: { usuario: { select: { nome: true } } } }),
      this.prisma.$queryRaw<{ id: number; titulo: string; estoqueAtual: number; estoqueMinimo: number }[]>(Prisma.sql`SELECT id, titulo, estoqueAtual, estoqueMinimo FROM produtos WHERE ativo = 1 AND estoqueAtual <= estoqueMinimo ORDER BY estoqueAtual ASC LIMIT 5`),
    ]);
    return {
      pedidosHoje,
      vendasHoje: dinheiro(vendas._sum.total ?? 0),
      itensEmEstoque: estoque._sum.estoqueAtual ?? 0,
      produtosEstoqueBaixo: Number(baixoRaw[0]?.n ?? 0),
      produtosSemEstoque: semEstoque,
      pedidosPorStatus: Object.fromEntries(porStatus.map((s) => [s.status, s._count._all])),
      pedidosRecentes: recentes.map((p) => ({ numero: p.numero, cliente: p.usuario.nome, total: dinheiro(p.total), status: p.status, rotuloStatus: ROTULO_CLIENTE[p.status], criadoEm: p.criadoEm })),
      estoqueCritico: criticoRaw.map((p) => ({ id: p.id, titulo: p.titulo, estoqueAtual: p.estoqueAtual, estoqueMinimo: p.estoqueMinimo, situacao: statusEstoque(p.estoqueAtual, p.estoqueMinimo) })),
    };
  }

  // ---------- Produtos e estoque ----------
  private mapProduto(p: Prisma.ProdutoGetPayload<{ include: { categoria: { select: { id: true; nome: true } } } }>) {
    return {
      id: p.id, titulo: p.titulo, autor: p.autor, slug: p.slug, descricao: p.descricao, preco: dinheiro(p.preco), imagem: p.imagem,
      formato: p.formato, idioma: p.idioma, ativo: p.ativo, destaque: p.destaque, categoria: p.categoria, categoriaId: p.categoriaId,
      estoqueAtual: p.estoqueAtual, estoqueMinimo: p.estoqueMinimo, situacaoEstoque: statusEstoque(p.estoqueAtual, p.estoqueMinimo),
      pesoGramas: p.pesoGramas, alturaCm: p.alturaCm, larguraCm: p.larguraCm, comprimentoCm: p.comprimentoCm,
    };
  }

  async listarProdutos(q: Q) {
    const where: Prisma.ProdutoWhereInput = {};
    if (q.q) where.OR = [{ titulo: { contains: q.q } }, { autor: { contains: q.q } }];
    if (q.categoriaId) where.categoriaId = q.categoriaId;
    if (q.ativo) where.ativo = q.ativo === 'true';
    if (q.estoque === 'sem') where.estoqueAtual = { lte: 0 };
    if (q.estoque === 'baixo') {
      const ids = await this.prisma.$queryRaw<{ id: number }[]>(Prisma.sql`SELECT id FROM produtos WHERE estoqueAtual > 0 AND estoqueAtual <= estoqueMinimo`);
      where.id = { in: ids.map((i) => i.id) };
    }
    const [total, itens] = await this.prisma.$transaction([
      this.prisma.produto.count({ where }),
      this.prisma.produto.findMany({ where, orderBy: { titulo: 'asc' }, include: { categoria: { select: { id: true, nome: true } } }, ...paginar(q.pagina, q.porPagina) }),
    ]);
    return { itens: itens.map((p) => this.mapProduto(p)), total, pagina: q.pagina, porPagina: q.porPagina, totalPaginas: totalPaginas(total, q.porPagina) };
  }

  async obterProduto(id: number) {
    const p = await this.prisma.produto.findUnique({ where: { id }, include: { categoria: { select: { id: true, nome: true } } } });
    if (!p) throw new NotFoundException('Produto não encontrado.');
    return this.mapProduto(p);
  }

  private async slugUnico(titulo: string, ignorarId?: number) {
    const base = slugify(titulo) || 'produto';
    let slug = base;
    for (let n = 2; await this.prisma.produto.findFirst({ where: { slug, ...(ignorarId ? { id: { not: ignorarId } } : {}) }, select: { id: true } }); n++) {
      slug = `${base}-${n}`.slice(0, 100);
    }
    return slug;
  }

  async criarProduto(dto: ProdutoAdminInput, usuarioId: number, ip?: string) {
    if (!(await this.prisma.categoria.findUnique({ where: { id: dto.categoriaId } }))) throw new BadRequestException('Categoria inválida.');
    const { estoqueInicial, imagem, ...resto } = dto;
    const slug = await this.slugUnico(dto.titulo);
    const p = await this.prisma.produto.create({
      data: {
        ...resto, slug, imagem: imagem || null, estoqueAtual: estoqueInicial,
        movimentacoes: estoqueInicial > 0 ? { create: { tipo: 'ENTRADA', quantidade: estoqueInicial, usuarioId, observacao: 'Estoque inicial' } } : undefined,
      },
      include: { categoria: { select: { id: true, nome: true } } },
    });
    await this.audit.registrar({ usuarioId, acao: 'PRODUTO_CRIADO', entidade: 'produto', entidadeId: p.id, ip });
    return this.mapProduto(p);
  }

  async atualizarProduto(id: number, dto: Partial<Omit<ProdutoAdminInput, 'estoqueInicial'>>, usuarioId: number, ip?: string) {
    await this.obterProduto(id);
    if (dto.categoriaId && !(await this.prisma.categoria.findUnique({ where: { id: dto.categoriaId } }))) throw new BadRequestException('Categoria inválida.');
    const { imagem, ...resto } = dto;
    const p = await this.prisma.produto.update({
      where: { id },
      data: { ...resto, ...(imagem !== undefined ? { imagem: imagem || null } : {}) },
      include: { categoria: { select: { id: true, nome: true } } },
    });
    await this.audit.registrar({ usuarioId, acao: 'PRODUTO_ATUALIZADO', entidade: 'produto', entidadeId: id, ip });
    return this.mapProduto(p);
  }

  /** Produtos com pedidos não são apagados: apenas inativados. */
  async inativarProduto(id: number, usuarioId: number, ip?: string) {
    await this.obterProduto(id);
    await this.prisma.produto.update({ where: { id }, data: { ativo: false } });
    await this.audit.registrar({ usuarioId, acao: 'PRODUTO_INATIVADO', entidade: 'produto', entidadeId: id, ip });
  }

  async entradaEstoque(d: { produtoId: number; quantidade: number; observacao?: string }, usuarioId: number, ip?: string) {
    await this.obterProduto(d.produtoId);
    await this.prisma.$transaction([
      this.prisma.produto.update({ where: { id: d.produtoId }, data: { estoqueAtual: { increment: d.quantidade } } }),
      this.prisma.movimentacaoEstoque.create({ data: { produtoId: d.produtoId, tipo: 'ENTRADA', quantidade: d.quantidade, usuarioId, observacao: d.observacao } }),
    ]);
    await this.audit.registrar({ usuarioId, acao: 'ESTOQUE_ENTRADA', entidade: 'produto', entidadeId: d.produtoId, detalhes: `+${d.quantidade}`, ip });
    return this.obterProduto(d.produtoId);
  }

  async ajusteEstoque(d: { produtoId: number; novoEstoque: number; motivo: string }, usuarioId: number, ip?: string) {
    const atual = await this.obterProduto(d.produtoId);
    const delta = d.novoEstoque - atual.estoqueAtual;
    await this.prisma.$transaction([
      this.prisma.produto.update({ where: { id: d.produtoId }, data: { estoqueAtual: d.novoEstoque } }),
      this.prisma.movimentacaoEstoque.create({ data: { produtoId: d.produtoId, tipo: 'AJUSTE', quantidade: delta, usuarioId, observacao: d.motivo } }),
    ]);
    await this.audit.registrar({ usuarioId, acao: 'ESTOQUE_AJUSTE', entidade: 'produto', entidadeId: d.produtoId, detalhes: `${atual.estoqueAtual} -> ${d.novoEstoque}: ${d.motivo}`, ip });
    return this.obterProduto(d.produtoId);
  }

  async historicoEstoque(produtoId: number) {
    const m = await this.prisma.movimentacaoEstoque.findMany({ where: { produtoId }, orderBy: { criadoEm: 'desc' }, take: 50 });
    return m.map((x) => ({ id: x.id, tipo: x.tipo, quantidade: x.quantidade, observacao: x.observacao, pedidoId: x.pedidoId, criadoEm: x.criadoEm }));
  }

  // ---------- Pedidos ----------
  async listarPedidos(q: Q) {
    const where: Prisma.PedidoWhereInput = {};
    if (q.status) where.status = q.status;
    if (q.q) where.OR = [{ numero: { contains: q.q } }, { usuario: { nome: { contains: q.q } } }, { usuario: { email: { contains: q.q } } }];
    const [total, itens] = await this.prisma.$transaction([
      this.prisma.pedido.count({ where }),
      this.prisma.pedido.findMany({ where, orderBy: { criadoEm: 'desc' }, include: { usuario: { select: { nome: true, email: true } }, itens: { select: { quantidade: true } } }, ...paginar(q.pagina, q.porPagina) }),
    ]);
    return {
      itens: itens.map((p) => ({
        numero: p.numero, cliente: p.usuario.nome, email: p.usuario.email, status: p.status, rotuloStatus: ROTULO_CLIENTE[p.status],
        tipoEntrega: p.tipoEntrega, total: dinheiro(p.total), quantidadeItens: p.itens.reduce((s, i) => s + i.quantidade, 0), criadoEm: p.criadoEm,
        proximosStatus: proximosStatus(p.status, p.tipoEntrega),
      })),
      total, pagina: q.pagina, porPagina: q.porPagina, totalPaginas: totalPaginas(total, q.porPagina),
    };
  }

  async detalhePedido(numero: string) {
    const p = await this.prisma.pedido.findUnique({ where: { numero }, include: { ...incluirPedido, usuario: { select: { nome: true, email: true, telefone: true } } } });
    if (!p) throw new NotFoundException('Pedido não encontrado.');
    return { ...mapPedido(p), cliente: p.usuario, proximosStatus: proximosStatus(p.status, p.tipoEntrega) };
  }

  async mudarStatus(
    numero: string,
    d: { status: Parameters<typeof podeTransicionar>[1]; transportadora?: string; codigoRastreio?: string; dataPrevista?: Date },
    usuarioId: number,
    ip?: string,
  ) {
    const p = await this.prisma.pedido.findUnique({ where: { numero }, include: { usuario: true } });
    if (!p) throw new NotFoundException('Pedido não encontrado.');
    if (d.status === 'PAGO') throw new BadRequestException('O status "Pago" é definido automaticamente pela confirmação do pagamento.');
    if (!podeTransicionar(p.status, d.status, p.tipoEntrega)) {
      throw new BadRequestException(`Não é possível mudar de "${ROTULO_CLIENTE[p.status]}" para "${ROTULO_CLIENTE[d.status]}".`);
    }

    if (d.status === 'CANCELADO') {
      const ok = await this.pedidos.cancelarInterno(p.id, 'Cancelado pela loja', usuarioId, STATUS_CANCELAVEIS);
      if (!ok) throw new ConflictException('O pedido foi alterado por outra pessoa. Atualize a página.');
    } else {
      const r = await this.prisma.pedido.updateMany({ where: { id: p.id, status: p.status }, data: { status: d.status } });
      if (r.count !== 1) throw new ConflictException('O pedido foi alterado por outra pessoa. Atualize a página.');
      if (d.status === 'ENVIADO') {
        await this.prisma.envio.upsert({
          where: { pedidoId: p.id },
          update: { transportadora: d.transportadora, codigoRastreio: d.codigoRastreio, dataPrevista: d.dataPrevista },
          create: { pedidoId: p.id, transportadora: d.transportadora, codigoRastreio: d.codigoRastreio, dataPrevista: d.dataPrevista },
        });
      }
    }
    await this.audit.registrar({ usuarioId, acao: 'PEDIDO_STATUS', entidade: 'pedido', entidadeId: numero, detalhes: `${p.status} -> ${d.status}`, ip });

    if (d.status === 'ENVIADO') await this.mail.pedidoEnviado(p.usuario.email, p.usuario.nome, numero, d.codigoRastreio, d.transportadora);
    if (d.status === 'PRONTO_RETIRADA') await this.mail.prontoRetirada(p.usuario.email, p.usuario.nome, numero);
    if (d.status === 'CANCELADO') await this.mail.pedidoCancelado(p.usuario.email, p.usuario.nome, numero);
    return this.detalhePedido(numero);
  }

  // ---------- Clientes (consulta restrita e auditada) ----------
  async listarClientes(q: Q, usuarioId: number, ip?: string) {
    const where: Prisma.UsuarioWhereInput = { perfil: 'CLIENTE', removidoEm: null };
    if (q.q) where.OR = [{ nome: { contains: q.q } }, { email: { contains: q.q } }];
    const [total, itens] = await this.prisma.$transaction([
      this.prisma.usuario.count({ where }),
      this.prisma.usuario.findMany({ where, orderBy: { criadoEm: 'desc' }, select: { id: true, nome: true, email: true, telefone: true, criadoEm: true, _count: { select: { pedidos: true } } }, ...paginar(q.pagina, q.porPagina) }),
    ]);
    await this.audit.registrar({ usuarioId, acao: 'CONSULTA_CLIENTES', entidade: 'usuario', detalhes: q.q ? `busca: ${String(q.q).slice(0, 60)}` : 'listagem', ip });
    return { itens: itens.map((c) => ({ id: c.id, nome: c.nome, email: c.email, telefone: c.telefone, criadoEm: c.criadoEm, totalPedidos: c._count.pedidos })), total, pagina: q.pagina, porPagina: q.porPagina, totalPaginas: totalPaginas(total, q.porPagina) };
  }

  // ---------- Banners ----------
  listarBanners() {
    return this.prisma.banner.findMany({ orderBy: [{ ordem: 'asc' }, { id: 'asc' }] });
  }

  private dadosBanner(d: Partial<BannerInput>) {
    return { ...d, subtitulo: d.subtitulo || null, imagem: d.imagem || null, link: d.link || null, inicio: d.inicio ?? null, fim: d.fim ?? null };
  }

  async criarBanner(d: BannerInput, usuarioId: number, ip?: string) {
    const b = await this.prisma.banner.create({ data: this.dadosBanner(d) as Prisma.BannerCreateInput });
    await this.audit.registrar({ usuarioId, acao: 'BANNER_CRIADO', entidade: 'banner', entidadeId: b.id, ip });
    return b;
  }

  async atualizarBanner(id: number, d: BannerInput, usuarioId: number, ip?: string) {
    if (!(await this.prisma.banner.findUnique({ where: { id } }))) throw new NotFoundException('Banner não encontrado.');
    const b = await this.prisma.banner.update({ where: { id }, data: this.dadosBanner(d) });
    await this.audit.registrar({ usuarioId, acao: 'BANNER_ATUALIZADO', entidade: 'banner', entidadeId: id, ip });
    return b;
  }

  async excluirBanner(id: number, usuarioId: number, ip?: string) {
    await this.prisma.banner.delete({ where: { id } }).catch(() => { throw new NotFoundException('Banner não encontrado.'); });
    await this.audit.registrar({ usuarioId, acao: 'BANNER_EXCLUIDO', entidade: 'banner', entidadeId: id, ip });
  }
}
