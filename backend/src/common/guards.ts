import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { PerfilUsuario } from '@prisma/client';
import { IS_PUBLIC, ROLES_KEY, UsuarioAutenticado } from './decorators';
import type { Env } from '../config/env';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private jwt: JwtService,
    private cfg: ConfigService<Env, true>,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const publica = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [ctx.getHandler(), ctx.getClass()]);
    const req = ctx.switchToHttp().getRequest();
    const auth: string | undefined = req.headers['authorization'];
    const token = auth?.startsWith('Bearer ') ? auth.slice(7) : undefined;

    if (!token) {
      if (publica) return true;
      throw new UnauthorizedException('Faça login para continuar.');
    }
    try {
      const payload = await this.jwt.verifyAsync<UsuarioAutenticado>(token, { secret: this.cfg.get('JWT_SECRET') });
      req.user = { sub: payload.sub, perfil: payload.perfil };
      return true;
    } catch {
      if (publica) return true; // token inválido em rota pública é ignorado
      throw new UnauthorizedException('Sessão expirada. Faça login novamente.');
    }
  }
}

/** A autorização é verificada no servidor em cada rota (RN04), nunca apenas escondida na interface. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const perfis = this.reflector.getAllAndOverride<PerfilUsuario[]>(ROLES_KEY, [ctx.getHandler(), ctx.getClass()]);
    if (!perfis?.length) return true;
    const user = ctx.switchToHttp().getRequest().user as UsuarioAutenticado | undefined;
    if (!user || !perfis.includes(user.perfil)) throw new ForbiddenException('Você não tem permissão para esta ação.');
    return true;
  }
}
