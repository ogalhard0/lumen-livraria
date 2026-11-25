import { BadRequestException, Inject, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma.service';
import { aplicarFreteGratis, consolidarItens, normalizarCep, toCents, type ItemEntrada, type OpcaoFrete } from '../domain';
import { FRETE_PROVIDER, type FreteProvider, type PacoteFrete } from './frete.provider';
import type { Env } from '../config/env';

export const OPCAO_RETIRADA: OpcaoFrete = { codigo: 'RETIRADA', nome: 'Retirar na loja', precoCents: 0, prazoDias: 0 };

@Injectable()
export class FreteService {
  private readonly logger = new Logger('Frete');

  constructor(
    private prisma: PrismaService,
    private cfg: ConfigService<Env, true>,
    @Inject(FRETE_PROVIDER) private provider: FreteProvider,
  ) {}

  /** Monta o pacote a partir do banco (peso, dimensões e preços reais). */
  private async montarPacote(cepDestino: string, itens: ItemEntrada[]): Promise<{ pacote: PacoteFrete; subtotalCents: number }> {
    const consolidados = consolidarItens(itens);
    const produtos = await this.prisma.produto.findMany({ where: { id: { in: consolidados.map((i) => i.produtoId) }, ativo: true } });
    const mapa = new Map(produtos.map((p) => [p.id, p]));
    const linhas = consolidados.map((i) => {
      const p = mapa.get(i.produtoId);
      if (!p) throw new BadRequestException('Há itens indisponíveis no carrinho.');
      if (p.formato !== 'FISICO') throw new BadRequestException(`"${p.titulo}" é um produto digital e ainda não está disponível para compra.`);
      return { p, quantidade: i.quantidade };
    });
    const pesoGramas = linhas.reduce((s, l) => s + l.p.pesoGramas * l.quantidade, 0);
    const subtotalCents = linhas.reduce((s, l) => s + toCents(l.p.preco) * l.quantidade, 0);
    return {
      subtotalCents,
      pacote: {
        cepDestino,
        pesoGramas,
        alturaCm: Math.max(...linhas.map((l) => l.p.alturaCm)) * linhas.reduce((s, l) => s + l.quantidade, 0),
        larguraCm: Math.max(...linhas.map((l) => l.p.larguraCm)),
        comprimentoCm: Math.max(...linhas.map((l) => l.p.comprimentoCm)),
        valorSeguroCents: subtotalCents,
        itens: linhas.map((l) => ({ id: l.p.id, quantidade: l.quantidade, pesoGramas: l.p.pesoGramas, alturaCm: l.p.alturaCm, larguraCm: l.p.larguraCm, comprimentoCm: l.p.comprimentoCm, valorCents: toCents(l.p.preco) })),
      },
    };
  }

  /** Opções de entrega para o carrinho. A retirada na loja é sempre oferecida. */
  async calcular(cep: string, itens: ItemEntrada[]): Promise<{ opcoes: OpcaoFrete[]; subtotalCents: number }> {
    const cepNorm = normalizarCep(cep);
    if (!cepNorm) throw new BadRequestException('CEP inválido.');
    const { pacote, subtotalCents } = await this.montarPacote(cepNorm, itens).catch((e) => {
      if (e instanceof BadRequestException) throw e;
      throw new BadRequestException((e as Error).message);
    });
    let opcoes: OpcaoFrete[];
    try {
      opcoes = await this.provider.cotar(pacote);
    } catch (e) {
      this.logger.error(`Falha na cotação de frete: ${(e as Error).message}`);
      throw new ServiceUnavailableException('Não foi possível calcular o frete agora. Tente novamente ou escolha retirar na loja.');
    }
    opcoes = aplicarFreteGratis(opcoes, subtotalCents, this.cfg.get('FRETE_GRATIS_ACIMA_CENTS'));
    return { opcoes: [OPCAO_RETIRADA, ...opcoes], subtotalCents };
  }

  /** Reconfirma no servidor a opção escolhida (o preço do frete nunca vem do navegador). */
  async escolher(cep: string, itens: ItemEntrada[], codigo: string): Promise<OpcaoFrete> {
    const { opcoes } = await this.calcular(cep, itens);
    const o = opcoes.find((x) => x.codigo === codigo && x.codigo !== 'RETIRADA');
    if (!o) throw new BadRequestException('Opção de frete indisponível. Recalcule o frete.');
    return o;
  }
}
