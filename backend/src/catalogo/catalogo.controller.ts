import { Controller, Get, Param, Query } from '@nestjs/common';
import { CatalogoService } from './catalogo.service';
import { Public } from '../common/decorators';
import { ZodPipe } from '../common/zod.pipe';
import { produtoQuerySchema } from '../schemas';
import type { ProdutoQuery } from '../schemas';

@Public()
@Controller()
export class CatalogoController {
  constructor(private catalogo: CatalogoService) {}

  @Get('categorias')
  categorias() {
    return this.catalogo.categorias();
  }

  @Get('produtos')
  listar(@Query(new ZodPipe(produtoQuerySchema)) q: ProdutoQuery) {
    return this.catalogo.listar(q);
  }

  @Get('produtos/:slug')
  detalhe(@Param('slug') slug: string) {
    return this.catalogo.detalhe(slug);
  }
}
