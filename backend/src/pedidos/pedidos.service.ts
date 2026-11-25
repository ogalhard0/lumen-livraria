import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import type { Prisma, StatusPedido } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../common/audit.service';
import { dinheiro } from '../common/util';
import { FreteService } from '../frete/frete.service';
import { MailService } from '../mail/mail.service';
import {
  calcularTotais, consolidarItens, etapasRastreamento, formatarNumeroPedido, fromCents, normalizarCep,
  ROTULO_CLIENTE, toCents,
} from '../domain';
import type { Env } from '../config/env';
import type { PedidoCriarInput } from '../schemas';

export const incluirPedido = {
  itens: true,
  endereco: true,
  envio: true,
  pagamentos: { orderBy: { criadoEm: 'desc' } },
} satisfies Prisma.PedidoInclude;
export type PedidoCompleto = Prisma.PedidoGetPayload<{ include: typeof incluirPedido }>;

export const STATUS_CANCELAVEIS: StatusPedido[] = ['AGUARDANDO_PAGAMENTO', 'PAGO', 'EM_SEPARACAO'];

export function mapPedido(p: PedidoCompleto) {
  const pag = p.pagamentos[0];
  return {
    numero: p.numero,
    status: p.status,
    rotuloStatus: ROTULO_CLIENTE[p.status],
    tipoEntrega: p.tipoEntrega,
    subtotal: dinheiro(p.subtotal),
    frete: dinheiro(p.frete),
    total: dinheiro(p.total),
    servicoFrete: p.servicoFrete,
    prazoDias: p.prazoDias,
    telefone: p.telefone,
    criadoEm: p.criadoEm,
    expiraEm: p.expiraEm,
    itens: p.itens.map((i) => ({ produtoId: i.produtoId, titulo: i.titulo, quantidade: i.quantidade, precoUnitario: dinheiro(i.precoUnitario) })),
    endereco: p.endereco && { cep: p.endereco.cep, logradouro: p.endereco.logradouro, numero: p.endereco.numero, complemento: p.endereco.complemento, bairro: p.endereco.bairro, cidade: p.endereco.cidade, uf: p.endereco.uf },
    envio: p.envio && { transportadora: p.envio.transportadora, codigoRastreio: p.envio.codigoRastreio, dataPrevista: p.envio.dataPrevista },
    pagamento: pag && { id: pag.id, metodo: pag.metodo, status: pag.status },
    etapas: p.status === 'CANCELADO' || p.status === 'AGUARDANDO_PAGAMENTO' ? [] : etapasRastreamento(p.status, p.tipoEntrega),
  };
}

@Injectable()
export class PedidosService {
  private readonly logger = new Logger('Pedidos');

  constructor(
    private prisma: PrismaService,
    private cfg: ConfigService<Env, true>,
    private frete: FreteService,
    private mail: MailService,
    private audit: AuditService,
  ) {}

  async criar(usuarioId: number, dto: PedidoCriarInput, ip?: string) {
    let itens;
    try {
      itens = consolidarItens(dto.itens);
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }
    const produtos = await this.prisma.produto.findMany({ where: { id: { in: itens.map((i) => i.produtoId) }, ativo: true } });
    if (produtos.length !== itens.length) throw new BadRequestException('Há itens indisponíveis no carrinho.');
    const mapa = new Map(produtos.map((p) => [p.id, p]));
    const linhas = itens.map((i) => ({ p: mapa.get(i.produtoId)!, quantidade: i.quantidade }));
    const digital = linhas.find((l) => l.p.formato !== 'FISICO');
    if (digital) throw new BadRequestException(`"${digital.p.titulo}" é um produto digital e ainda não está disponível para compra.`);

    // O frete é recalculado no servidor.
    let freteCents = 0;
    let prazoDias: number | null = null;
    let servicoFrete: string | null = null;
    if (dto.tipoEntrega === 'ENVIO') {
      const opcao = await this.frete.escolher(dto.endereco!.cep, itens, dto.servicoFrete!);
      freteCents = opcao.precoCents;
      prazoDias = opcao.prazoDias;
      servicoFrete = opcao.nome.slice(0, 80);
    }
    const totais = calcularTotais(linhas.map((l) => ({ precoCents: toCents(l.p.preco), quantidade: l.quantidade })), freteCents);
    const expiraEm = new Date(Date.now() + this.cfg.get('PEDIDO_EXPIRA_MINUTOS') * 60_000);

    const pedido = await this.prisma.$transaction(async (tx) => {
      // Reserva atômica: só baixa se houver saldo (RN01). Em caso de falha, toda a transação é desfeita.
      for (const l of linhas) {
        const r = await tx.produto.updateMany({
          where: { id: l.p.id, ativo: true, estoqueAtual: { gte: l.quantidade } },
          data: { estoqueAtual: { decrement: l.quantidade } },
        });
        if (r.count !== 1) throw new ConflictException(`Estoque insuficiente para "${l.p.titulo}".`);
      }
      let enderecoId: number | null = null;
      if (dto.tipoEntrega === 'ENVIO') {
        const e = dto.endereco!;
        const end = await tx.endereco.create({
          data: { usuarioId, cep: normalizarCep(e.cep)!, logradouro: e.logradouro, numero: e.numero, complemento: e.complemento || null, bairro: e.bairro, cidade: e.cidade, uf: e.uf },
        });
        enderecoId = end.id;
      }
      const criado = await tx.pedido.create({
        data: {
          numero: `TMP-${randomUUID()}`,
          usuarioId,
          subtotal: fromCents(totais.subtotalCents),
          frete: fromCents(totais.freteCents),
          total: fromCents(totais.totalCents),
          tipoEntrega: dto.tipoEntrega,
          telefone: dto.telefone,
          enderecoId,
          servicoFrete,
          prazoDias,
          expiraEm,
          // preço congelado no momento da compra
          itens: { create: linhas.map((l) => ({ produtoId: l.p.id, titulo: l.p.titulo, quantidade: l.quantidade, precoUnitario: l.p.preco })) },
        },
      });
      await tx.pedido.update({ where: { id: criado.id }, data: { numero: formatarNumeroPedido(criado.id) } });
      await tx.movimentacaoEstoque.createMany({
        data: linhas.map((l) => ({ produtoId: l.p.id, tipo: 'RESERVA' as const, quantidade: -l.quantidade, pedidoId: criado.id, usuarioId })),
      });
      return tx.pedido.findUniqueOrThrow({ where: { id: criado.id }, include: incluirPedido });
    });
    await this.audit.registrar({ usuarioId, acao: 'PEDIDO_CRIADO', entidade: 'pedido', entidadeId: pedido.numero, ip });
    return mapPedido(pedido);
  }

  async listarDoCliente(usuarioId: number) {
    const pedidos = await this.prisma.pedido.findMany({ where: { usuarioId }, include: incluirPedido, orderBy: { criadoEm: 'desc' }, take: 50 });
    return pedidos.map(mapPedido);
  }

  /** Verifica a propriedade do recurso: um cliente nunca acessa pedidos de outro. */
  async obterDoCliente(usuarioId: number, numero: string) {
    const p = await this.prisma.pedido.findFirst({ where: { numero, usuarioId }, include: incluirPedido });
    if (!p) throw new NotFoundException('Pedido não encontrado.');
    return mapPedido(p);
  }

  async cancelarDoCliente(usuarioId: number, numero: string) {
    const p = await this.prisma.pedido.findFirst({ where: { numero, usuarioId } });
    if (!p) throw new NotFoundException('Pedido não encontrado.');
    if (p.status !== 'AGUARDANDO_PAGAMENTO') throw new ConflictException('Só é possível cancelar pedidos que ainda aguardam pagamento.');
    await this.cancelarInterno(p.id, 'Cancelado pelo cliente', usuarioId, ['AGUARDANDO_PAGAMENTO']);
    return this.obterDoCliente(usuarioId, numero);
  }

  /** Cancela com guarda de estado (evita processamento duplo) e devolve o estoque reservado. */
  async cancelarInterno(pedidoId: number, motivo: string, usuarioId: number | undefined, estadosPermitidos: StatusPedido[]): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const r = await tx.pedido.updateMany({ where: { id: pedidoId, status: { in: estadosPermitidos } }, data: { status: 'CANCELADO' } });
      if (r.count !== 1) return false;
      const itens = await tx.itemPedido.findMany({ where: { pedidoId } });
      for (const i of itens) {
        await tx.produto.update({ where: { id: i.produtoId }, data: { estoqueAtual: { increment: i.quantidade } } });
      }
      await tx.movimentacaoEstoque.createMany({
        data: itens.map((i) => ({ produtoId: i.produtoId, tipo: 'LIBERACAO' as const, quantidade: i.quantidade, pedidoId, usuarioId: usuarioId ?? null, observacao: motivo.slice(0, 200) })),
      });
      return true;
    });
  }

  /** Pedidos sem pagamento no prazo são cancelados e o estoque reservado é liberado. */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async expirarPendentes() {
    const vencidos = await this.prisma.pedido.findMany({
      where: { status: 'AGUARDANDO_PAGAMENTO', expiraEm: { lt: new Date() } },
      select: { id: true, numero: true, usuario: { select: { email: true, nome: true } } },
      take: 100,
    });
    for (const v of vencidos) {
      try {
        const ok = await this.cancelarInterno(v.id, 'Expirado sem pagamento', undefined, ['AGUARDANDO_PAGAMENTO']);
        if (ok) {
          await this.audit.registrar({ acao: 'PEDIDO_EXPIRADO', entidade: 'pedido', entidadeId: v.numero });
          await this.mail.pedidoCancelado(v.usuario.email, v.usuario.nome, v.numero);
        }
      } catch (e) {
        this.logger.error(`Falha ao expirar ${v.numero}: ${(e as Error).message}`);
      }
    }
  }
}
