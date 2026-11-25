import { Body, Controller, Delete, ForbiddenException, Get, HttpCode, Post, Req, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthService, COOKIE_REFRESH } from './auth.service';
import { ClientIp, CurrentUser, Public, UsuarioAutenticado } from '../common/decorators';
import { ZodPipe } from '../common/zod.pipe';
import { cadastroSchema, loginSchema, recuperarSenhaSchema, redefinirSenhaSchema } from '../schemas';
import type { CadastroInput, LoginInput } from '../schemas';

/** Proteção CSRF do refresh/logout: cookie SameSite=Strict + cabeçalho customizado (exige CORS preflight). */
function exigirCabecalho(req: Request) {
  if (req.headers['x-requested-with'] !== 'lumen') throw new ForbiddenException('Requisição não permitida.');
}

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('cadastro')
  cadastro(@Body(new ZodPipe(cadastroSchema)) dto: CadastroInput, @Res({ passthrough: true }) res: Response, @ClientIp() ip?: string) {
    return this.auth.cadastro(dto, res, ip);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(200)
  @Post('login')
  login(@Body(new ZodPipe(loginSchema)) dto: LoginInput, @Res({ passthrough: true }) res: Response, @ClientIp() ip?: string) {
    return this.auth.login(dto.email, dto.senha, res, ip);
  }

  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @HttpCode(200)
  @Post('refresh')
  refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    exigirCabecalho(req);
    return this.auth.refresh(req.cookies?.[COOKIE_REFRESH], res);
  }

  @Public()
  @HttpCode(204)
  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    exigirCabecalho(req);
    await this.auth.logout(req.cookies?.[COOKIE_REFRESH], res);
  }

  @Get('me')
  me(@CurrentUser() u: UsuarioAutenticado) {
    return this.auth.me(u.sub);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(204)
  @Post('recuperar-senha')
  async recuperar(@Body(new ZodPipe(recuperarSenhaSchema)) dto: { email: string }) {
    await this.auth.recuperarSenha(dto.email);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(204)
  @Post('redefinir-senha')
  async redefinir(@Body(new ZodPipe(redefinirSenhaSchema)) dto: { token: string; senha: string }) {
    await this.auth.redefinirSenha(dto.token, dto.senha);
  }

  @Get('meus-dados')
  meusDados(@CurrentUser() u: UsuarioAutenticado) {
    return this.auth.exportarDados(u.sub);
  }

  @HttpCode(204)
  @Delete('minha-conta')
  async excluir(@CurrentUser() u: UsuarioAutenticado, @Res({ passthrough: true }) res: Response, @ClientIp() ip?: string) {
    await this.auth.excluirConta(u.sub, res, ip);
  }
}
