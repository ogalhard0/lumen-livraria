import { ConflictException, Inject, Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Pagamento, StatusPagamento } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../common/audit.service';
import { MailService } from '../mail/mail.service';
import { toCents } from '../domain';
import { PAGAMENTO_PROVIDER, type PagamentoProvider } from './pagamento.provider';
import type { Env } from '../config/env';

function dto(p: Pagamento) {
  return { id: p.id, metodo: p.metodo, status: p.status, pixCopiaCola: p.pixCopiaCola, pixQrBase64: p.pixQrBase64, expiraEm: p.expiraEm };
}

@Injectable()
export class PagamentosService {
  private readonly logger = new Logger('Pagamentos');

  constructor(
    private prisma: PrismaService,
    private cfg: ConfigService<Env, true>,
    @Inject(PAGAMENTO_PROVIDER) private provider: PagamentoProvider,
    private mail: MailService,
    private audit: AuditService,
  ) {}

  private async pedidoPagavel(usuarioId: number, numero: string) {
    const p = await this.prisma.pedido.findFirst({ where: { numero, usuarioId }, include: { usuario: true } });
    if (!p) throw new NotFoundException('Pedido não encontrado.');
    if (p.status !== 'AGUARDANDO_PAGAMENTO') throw new ConflictException('Este pedido não está aguardando pagamento.');
    if (p.expiraEm < new Date()) throw new ConflictException('O prazo de pagamento deste pedido expirou. Faça um novo pedido.');
    return p;
  }

  async criarPix(usuarioId: number, numero: string) {
    const pedido = await this.pedidoPagavel(usuarioId, numero);
    // Idempotente: reaproveita a cobrança Pix pendente e ainda válida.
    const existente = await this.prisma.pagamento.findFirst({
      where: { pedidoId: pedido.id, metodo: 'PIX', status: 'PENDENTE' },
      orderBy: { criadoEm: 'desc' },
    });
    if (existente) return dto(existente);

    let r;
    try {
      r = await this.provider.criarPix({ numero, valorCents: toCents(pedido.total), descricao: `Pedido ${numero} – Lumen Livraria`, email: pedido.usuario.email, expiraEm: pedido.expiraEm });
    } catch (e) {
      this.logger.error(`Falha ao criar Pix (${numero}): ${(e as Error).message}`);
      throw new ServiceUnavailableException('Não foi possível gerar o Pix agora. Tente novamente.');
    }
    const pag = await this.prisma.pagamento.create({
      data: { pedidoId: pedido.id, metodo: 'PIX', idGateway: r.idGateway, status: r.status, valor: pedido.total, pixCopiaCola: r.pixCopiaCola, pixQrBase64: r.pixQrBase64, expiraEm: pedido.expiraEm },
    });
    if (r.status === 'APROVADO') await this.aplicarStatus(pag, 'APROVADO');
    return dto(pag);
  }

  async criarCartao(usuarioId: number, d: { numeroPedido: string; token: string; paymentMethodId: string; issuerId?: string; parcelas: number; documento?: string }) {
    const pedido = await this.pedidoPagavel(usuarioId, d.numeroPedido);
    let r;
    try {
      r = await this.provider.criarCartao({
        numero: d.numeroPedido, valorCents: toCents(pedido.total), descricao: `Pedido ${d.numeroPedido} – Lumen Livraria`,
        email: pedido.usuario.email, token: d.token, parcelas: d.parcelas, paymentMethodId: d.paymentMethodId, issuerId: d.issuerId, documento: d.documento,
      });
    } catch (e) {
      this.logger.error(`Falha no pagamento com cartão (${d.numeroPedido}): ${(e as Error).message}`);
      throw new ServiceUnavailableException('Não foi possível processar o pagamento agora. Tente novamente.');
    }
    const pag = await this.prisma.pagamento.create({
      data: { pedidoId: pedido.id, metodo: 'CARTAO', idGateway: r.idGateway, status: r.status, valor: pedido.total },
    });
    if (r.status === 'APROVADO') await this.aplicarStatus(pag, 'APROVADO');
    return dto(pag);
  }

  /** Chamado pelo webhook: consulta o provedor e aplica o status (idempotente). */
  async processarNotificacao(idGateway: string) {
    const pag = await this.prisma.pagamento.findUnique({ where: { idGateway } });
    if (!pag) return;
    const status = await this.provider.consultar(idGateway);
    await this.aplicarStatus(pag, status);
  }

  /** Somente com PAYMENT_PROVIDER=fake (desenvolvimento). */
  async simularAprovacao(usuarioId: number, pagamentoId: number) {
    if (this.provider.nome !== 'fake') throw new NotFoundException();
    const pag = await this.prisma.pagamento.findFirst({ where: { id: pagamentoId, pedido: { usuarioId } } });
    if (!pag) throw new NotFoundException('Pagamento não encontrado.');
    await this.aplicarStatus(pag, 'APROVADO');
    return { ok: true };
  }

  private async aplicarStatus(pag: Pagamento, novo: StatusPagamento) {
    if (pag.status === 'APROVADO' && novo !== 'ESTORNADO') return; // nunca "desaprova"
    if (pag.status !== novo) await this.prisma.pagamento.update({ where: { id: pag.id }, data: { status: novo } });
    if (novo === 'APROVADO') await this.confirmarPedido(pag.pedidoId);
  }

  /** Pedido só vira "pago" após a aprovação confirmada (RN02). A troca de estado é atômica e idempotente. */
  private async confirmarPedido(pedidoId: number) {
    const r = await this.prisma.pedido.updateMany({ where: { id: pedidoId, status: 'AGUARDANDO_PAGAMENTO' }, data: { status: 'PAGO' } });
    const p = await this.prisma.pedido.findUnique({ where: { id: pedidoId }, include: { usuario: true, itens: true } });
    if (!p) return;
    if (r.count === 1) {
      await this.audit.registrar({ acao: 'PEDIDO_PAGO', entidade: 'pedido', entidadeId: p.numero });
      await this.mail.confirmacaoPedido(p.usuario.email, {
        numero: p.numero, nome: p.usuario.nome, totalCents: toCents(p.total), retirada: p.tipoEntrega === 'RETIRADA',
        itens: p.itens.map((i) => ({ titulo: i.titulo, quantidade: i.quantidade })),
      });
    } else if (p.status === 'CANCELADO') {
      // Pagamento aprovado depois de o pedido expirar: exige tratamento manual (estorno ou reativação).
      this.logger.warn(`Pagamento aprovado para pedido já cancelado: ${p.numero}`);
      await this.audit.registrar({ acao: 'PAGAMENTO_APROVADO_PEDIDO_CANCELADO', entidade: 'pedido', entidadeId: p.numero, detalhes: 'Requer estorno ou reativação manual' });
    }
  }
}
