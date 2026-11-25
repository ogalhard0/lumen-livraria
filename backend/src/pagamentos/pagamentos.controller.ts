import { Body, Controller, ForbiddenException, Headers, HttpCode, Param, ParseIntPipe, Post, Query, Req } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { PagamentosService } from './pagamentos.service';
import { CurrentUser, Public, UsuarioAutenticado } from '../common/decorators';
import { ZodPipe } from '../common/zod.pipe';
import { pagamentoCartaoSchema, pagamentoPixSchema } from '../schemas';
import { verificarAssinaturaMP } from '../domain';
import type { Env } from '../config/env';

@Controller()
export class PagamentosController {
  constructor(private pagamentos: PagamentosService, private cfg: ConfigService<Env, true>) {}

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('pagamentos/pix')
  pix(@CurrentUser() u: UsuarioAutenticado, @Body(new ZodPipe(pagamentoPixSchema)) dto: { numeroPedido: string }) {
    return this.pagamentos.criarPix(u.sub, dto.numeroPedido);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('pagamentos/cartao')
  cartao(@CurrentUser() u: UsuarioAutenticado, @Body(new ZodPipe(pagamentoCartaoSchema)) dto: Parameters<PagamentosService['criarCartao']>[1]) {
    return this.pagamentos.criarCartao(u.sub, dto);
  }

  /** Apenas com PAYMENT_PROVIDER=fake: simula a aprovação do Pix em desenvolvimento. */
  @HttpCode(200)
  @Post('pagamentos/:id/simular-aprovacao')
  simular(@CurrentUser() u: UsuarioAutenticado, @Param('id', ParseIntPipe) id: number) {
    return this.pagamentos.simularAprovacao(u.sub, id);
  }

  /** Notificações do gateway: assinatura validada e status sempre reconsultado na API do provedor. */
  @Public()
  @SkipThrottle()
  @HttpCode(200)
  @Post('webhooks/pagamento')
  async webhook(
    @Req() req: Request,
    @Body() body: { type?: string; data?: { id?: string | number } },
    @Query() query: Record<string, any>,
    @Headers('x-signature') assinatura?: string,
    @Headers('x-request-id') requestId?: string,
  ) {
    if (this.cfg.get('PAYMENT_PROVIDER') !== 'mercadopago') return { ok: true };
    const dataId = String(query['data.id'] ?? query?.data?.id ?? body?.data?.id ?? '');
    const valida = verificarAssinaturaMP({ xSignature: assinatura, xRequestId: requestId, dataId, secret: this.cfg.get('MP_WEBHOOK_SECRET') ?? '' });
    if (!valida) throw new ForbiddenException('Assinatura inválida.');
    const tipo = query.type ?? body?.type ?? query.topic;
    if (tipo === 'payment' && /^[A-Za-z0-9-]{1,40}$/.test(dataId)) await this.pagamentos.processarNotificacao(dataId);
    return { ok: true };
  }
}
