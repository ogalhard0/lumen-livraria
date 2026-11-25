import {
  BadRequestException, Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post, Put, Query,
  UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { AdminService } from './admin.service';
import { StorageService } from './storage.service';
import { ClientIp, CurrentUser, Roles, UsuarioAutenticado } from '../common/decorators';
import { ZodPipe } from '../common/zod.pipe';
import {
  bannerSchema, clientesQuerySchema, estoqueAjusteSchema, estoqueEntradaSchema, pedidoListaQuerySchema, pedidoStatusSchema,
  produtoAdminAtualizarSchema, produtoAdminSchema, produtosAdminQuerySchema,
} from '../schemas';
import type { BannerInput, ProdutoAdminInput } from '../schemas';
import { numeroPedidoValido } from '../domain';

const ped = (n: string) => {
  if (!numeroPedidoValido(n)) throw new BadRequestException('Número de pedido inválido.');
  return n;
};

/** Atendente: pedidos e estoque. Administrador: tudo (produtos, banners, clientes). */
@Roles('ATENDENTE', 'ADMINISTRADOR')
@Controller('admin')
export class AdminController {
  constructor(private admin: AdminService, private storage: StorageService) {}

  @Get('resumo')
  resumo() {
    return this.admin.resumo();
  }

  // Produtos
  @Get('produtos')
  produtos(@Query(new ZodPipe(produtosAdminQuerySchema)) q: Record<string, any>) {
    return this.admin.listarProdutos(q);
  }

  @Get('produtos/:id')
  produto(@Param('id', ParseIntPipe) id: number) {
    return this.admin.obterProduto(id);
  }

  @Roles('ADMINISTRADOR')
  @Post('produtos')
  criarProduto(@CurrentUser() u: UsuarioAutenticado, @Body(new ZodPipe(produtoAdminSchema)) dto: ProdutoAdminInput, @ClientIp() ip?: string) {
    return this.admin.criarProduto(dto, u.sub, ip);
  }

  @Roles('ADMINISTRADOR')
  @Patch('produtos/:id')
  atualizarProduto(@CurrentUser() u: UsuarioAutenticado, @Param('id', ParseIntPipe) id: number, @Body(new ZodPipe(produtoAdminAtualizarSchema)) dto: any, @ClientIp() ip?: string) {
    return this.admin.atualizarProduto(id, dto, u.sub, ip);
  }

  @Roles('ADMINISTRADOR')
  @HttpCode(204)
  @Delete('produtos/:id')
  async inativar(@CurrentUser() u: UsuarioAutenticado, @Param('id', ParseIntPipe) id: number, @ClientIp() ip?: string) {
    await this.admin.inativarProduto(id, u.sub, ip);
  }

  // Estoque
  @Post('estoque/entradas')
  entrada(@CurrentUser() u: UsuarioAutenticado, @Body(new ZodPipe(estoqueEntradaSchema)) dto: any, @ClientIp() ip?: string) {
    return this.admin.entradaEstoque(dto, u.sub, ip);
  }

  @Roles('ADMINISTRADOR')
  @Post('estoque/ajustes')
  ajuste(@CurrentUser() u: UsuarioAutenticado, @Body(new ZodPipe(estoqueAjusteSchema)) dto: any, @ClientIp() ip?: string) {
    return this.admin.ajusteEstoque(dto, u.sub, ip);
  }

  @Get('estoque/:produtoId/historico')
  historico(@Param('produtoId', ParseIntPipe) id: number) {
    return this.admin.historicoEstoque(id);
  }

  // Pedidos
  @Get('pedidos')
  pedidos(@Query(new ZodPipe(pedidoListaQuerySchema)) q: Record<string, any>) {
    return this.admin.listarPedidos(q);
  }

  @Get('pedidos/:numero')
  pedido(@Param('numero') n: string) {
    return this.admin.detalhePedido(ped(n));
  }

  @Patch('pedidos/:numero/status')
  status(@CurrentUser() u: UsuarioAutenticado, @Param('numero') n: string, @Body(new ZodPipe(pedidoStatusSchema)) dto: any, @ClientIp() ip?: string) {
    return this.admin.mudarStatus(ped(n), dto, u.sub, ip);
  }

  // Clientes (somente leitura, restrito e auditado)
  @Roles('ADMINISTRADOR')
  @Get('clientes')
  clientes(@CurrentUser() u: UsuarioAutenticado, @Query(new ZodPipe(clientesQuerySchema)) q: Record<string, any>, @ClientIp() ip?: string) {
    return this.admin.listarClientes(q, u.sub, ip);
  }

  // Banners
  @Roles('ADMINISTRADOR')
  @Get('banners')
  banners() {
    return this.admin.listarBanners();
  }

  @Roles('ADMINISTRADOR')
  @Post('banners')
  criarBanner(@CurrentUser() u: UsuarioAutenticado, @Body(new ZodPipe(bannerSchema)) dto: BannerInput, @ClientIp() ip?: string) {
    return this.admin.criarBanner(dto, u.sub, ip);
  }

  @Roles('ADMINISTRADOR')
  @Put('banners/:id')
  atualizarBanner(@CurrentUser() u: UsuarioAutenticado, @Param('id', ParseIntPipe) id: number, @Body(new ZodPipe(bannerSchema)) dto: BannerInput, @ClientIp() ip?: string) {
    return this.admin.atualizarBanner(id, dto, u.sub, ip);
  }

  @Roles('ADMINISTRADOR')
  @HttpCode(204)
  @Delete('banners/:id')
  async excluirBanner(@CurrentUser() u: UsuarioAutenticado, @Param('id', ParseIntPipe) id: number, @ClientIp() ip?: string) {
    await this.admin.excluirBanner(id, u.sub, ip);
  }

  // Upload de imagens
  @Roles('ADMINISTRADOR')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('uploads')
  @UseInterceptors(FileInterceptor('arquivo', { limits: { fileSize: 2 * 1024 * 1024, files: 1 } }))
  async upload(@UploadedFile() arquivo?: Express.Multer.File) {
    return { url: await this.storage.salvarImagem(arquivo) };
  }
}
