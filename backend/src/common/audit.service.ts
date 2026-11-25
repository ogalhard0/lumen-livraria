import { Global, Injectable, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  /** Trilha de auditoria das ações administrativas e eventos sensíveis. Nunca registre senhas ou tokens. */
  async registrar(p: { usuarioId?: number | null; acao: string; entidade: string; entidadeId?: string | number; detalhes?: string; ip?: string }) {
    try {
      await this.prisma.logAuditoria.create({
        data: {
          usuarioId: p.usuarioId ?? null,
          acao: p.acao,
          entidade: p.entidade,
          entidadeId: p.entidadeId !== undefined ? String(p.entidadeId) : null,
          detalhes: p.detalhes?.slice(0, 400),
          ip: p.ip?.slice(0, 45),
        },
      });
    } catch {
      /* a auditoria não deve derrubar a operação principal */
    }
  }
}

@Global()
@Module({ providers: [AuditService], exports: [AuditService] })
export class AuditModule {}
