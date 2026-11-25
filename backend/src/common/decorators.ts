import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { PerfilUsuario } from '@prisma/client';

export const IS_PUBLIC = 'isPublic';
/** Rotas são privadas por padrão (negar por padrão). Use @Public() para liberar. */
export const Public = () => SetMetadata(IS_PUBLIC, true);

export const ROLES_KEY = 'roles';
export const Roles = (...perfis: PerfilUsuario[]) => SetMetadata(ROLES_KEY, perfis);

export interface UsuarioAutenticado {
  sub: number;
  perfil: PerfilUsuario;
}

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): UsuarioAutenticado => {
  return ctx.switchToHttp().getRequest().user;
});

export const ClientIp = createParamDecorator((_: unknown, ctx: ExecutionContext): string | undefined => {
  return ctx.switchToHttp().getRequest().ip;
});
