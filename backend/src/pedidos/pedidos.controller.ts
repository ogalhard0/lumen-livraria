import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PedidosService } from './pedidos.service';
import { ClientIp, CurrentUser, UsuarioAutenticado } from '../common/decorators';
import { ZodPipe } from '../common/zod.pipe';
import { pedidoCriarSchema } from '../schemas';
import type { PedidoCriarInput } from '../schemas';
import { BadRequestException } from '@nestjs/common';
import { numeroPedidoValido } from '../domain';

const numero = (n: string) => {
  if (!numeroPedidoValido(n)) throw new BadRequestException('Número de pedido inválido.');
  return n;
};

@Controller('pedidos')
export class PedidosController {
  constructor(private pedidos: PedidosService) {}

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post()
  criar(@CurrentUser() u: UsuarioAutenticado, @Body(new ZodPipe(pedidoCriarSchema)) dto: PedidoCriarInput, @ClientIp() ip?: string) {
    return this.pedidos.criar(u.sub, dto, ip);
  }

  @Get()
  listar(@CurrentUser() u: UsuarioAutenticado) {
    return this.pedidos.listarDoCliente(u.sub);
  }

  @Get(':numero')
  obter(@CurrentUser() u: UsuarioAutenticado, @Param('numero') n: string) {
    return this.pedidos.obterDoCliente(u.sub, numero(n));
  }

  /** Etapas, previsão e código de rastreio (tela de acompanhamento). */
  @Get(':numero/rastreamento')
  rastreamento(@CurrentUser() u: UsuarioAutenticado, @Param('numero') n: string) {
    return this.pedidos.obterDoCliente(u.sub, numero(n));
  }

  @HttpCode(200)
  @Post(':numero/cancelar')
  cancelar(@CurrentUser() u: UsuarioAutenticado, @Param('numero') n: string) {
    return this.pedidos.cancelarDoCliente(u.sub, numero(n));
  }
}
