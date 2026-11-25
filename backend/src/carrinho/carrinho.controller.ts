import { Body, Controller, Get, HttpCode, Post, Put } from '@nestjs/common';
import { CarrinhoService } from './carrinho.service';
import { CurrentUser, Public, UsuarioAutenticado } from '../common/decorators';
import { ZodPipe } from '../common/zod.pipe';
import { carrinhoSalvarSchema, carrinhoValidarSchema } from '../schemas';

@Controller('carrinho')
export class CarrinhoController {
  constructor(private carrinho: CarrinhoService) {}

  @Public()
  @HttpCode(200)
  @Post('validar')
  validar(@Body(new ZodPipe(carrinhoValidarSchema)) dto: { itens: { produtoId: number; quantidade: number }[] }) {
    return this.carrinho.validar(dto.itens);
  }

  @Get()
  obter(@CurrentUser() u: UsuarioAutenticado) {
    return this.carrinho.obter(u.sub);
  }

  @Put()
  salvar(@CurrentUser() u: UsuarioAutenticado, @Body(new ZodPipe(carrinhoSalvarSchema)) dto: { itens: { produtoId: number; quantidade: number }[] }) {
    return this.carrinho.salvar(u.sub, dto.itens);
  }
}
