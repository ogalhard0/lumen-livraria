import { Body, Controller, Get, HttpCode, NotFoundException, Param, Post, ServiceUnavailableException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FreteService } from './frete.service';
import { Public } from '../common/decorators';
import { ZodPipe } from '../common/zod.pipe';
import { freteSchema } from '../schemas';
import { normalizarCep, fromCents } from '../domain';

@Public()
@Controller()
export class FreteController {
  constructor(private frete: FreteService) {}

  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @HttpCode(200)
  @Post('frete/calcular')
  async calcular(@Body(new ZodPipe(freteSchema)) dto: { cep: string; itens: { produtoId: number; quantidade: number }[] }) {
    const { opcoes } = await this.frete.calcular(dto.cep, dto.itens);
    return { opcoes: opcoes.map((o) => ({ codigo: o.codigo, nome: o.nome, preco: fromCents(o.precoCents), prazoDias: o.prazoDias })) };
  }

  /** Preenchimento de endereço por CEP (ViaCEP). Host fixo e CEP validado: sem risco de SSRF. */
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Get('cep/:cep')
  async cep(@Param('cep') cep: string) {
    const n = normalizarCep(cep);
    if (!n) throw new NotFoundException('CEP inválido.');
    try {
      const r = await fetch(`https://viacep.com.br/ws/${n}/json/`, { signal: AbortSignal.timeout(4000) });
      const d = (await r.json()) as { erro?: boolean | string; logradouro?: string; bairro?: string; localidade?: string; uf?: string };
      if (!r.ok || d.erro) throw new NotFoundException('CEP não encontrado.');
      return { cep: n, logradouro: d.logradouro ?? '', bairro: d.bairro ?? '', cidade: d.localidade ?? '', uf: d.uf ?? '' };
    } catch (e) {
      if (e instanceof NotFoundException) throw e;
      throw new ServiceUnavailableException('Serviço de CEP indisponível. Preencha o endereço manualmente.');
    }
  }
}
