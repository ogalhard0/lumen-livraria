import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'node:crypto';
import type { Response } from 'express';
import type { Usuario } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../common/audit.service';
import { MailService } from '../mail/mail.service';
import { validarSenha } from '../domain';
import type { Env } from '../config/env';
import type { CadastroInput } from '../schemas';

export const COOKIE_REFRESH = 'lumen_rt';
const REFRESH_DIAS = 7;
const MAX_TENTATIVAS = 5;
const BLOQUEIO_MIN = 15;
const VERSAO_TERMOS = '2026-11';
const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');
const ARGON = { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

@Injectable()
export class AuthService {
  private dummyHash?: Promise<string>;

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private cfg: ConfigService<Env, true>,
    private mail: MailService,
    private audit: AuditService,
  ) {}

  private hash(senha: string) {
    return argon2.hash(senha, ARGON);
  }

  /** Hash fictício para igualar o tempo de resposta quando o e-mail não existe. */
  private getDummyHash() {
    this.dummyHash ??= this.hash(randomBytes(16).toString('hex'));
    return this.dummyHash;
  }

  publico(u: Usuario) {
    return { id: u.id, nome: u.nome, email: u.email, perfil: u.perfil, telefone: u.telefone };
  }

  private async emitirSessao(u: Usuario, res: Response) {
    const accessToken = await this.jwt.signAsync({ sub: u.id, perfil: u.perfil }, { expiresIn: '15m', secret: this.cfg.get('JWT_SECRET') });
    const refresh = randomBytes(48).toString('base64url');
    await this.prisma.refreshToken.create({
      data: { usuarioId: u.id, tokenHash: sha256(refresh), expiraEm: new Date(Date.now() + REFRESH_DIAS * 86_400_000) },
    });
    res.cookie(COOKIE_REFRESH, refresh, {
      httpOnly: true,
      secure: this.cfg.get('NODE_ENV') === 'production',
      sameSite: 'strict',
      path: '/api/v1/auth',
      maxAge: REFRESH_DIAS * 86_400_000,
    });
    return { accessToken, usuario: this.publico(u) };
  }

  async cadastro(dto: CadastroInput, res: Response, ip?: string) {
    const erros = validarSenha(dto.senha, dto.email);
    if (erros.length) throw new BadRequestException({ mensagem: 'Senha fraca', erros: erros.map((m) => ({ campo: 'senha', mensagem: m })) });
    const existe = await this.prisma.usuario.findUnique({ where: { email: dto.email } });
    if (existe) throw new ConflictException('Este e-mail já está cadastrado.');

    const senhaHash = await this.hash(dto.senha);
    const u = await this.prisma.usuario.create({
      data: {
        nome: dto.nome,
        email: dto.email,
        senhaHash,
        telefone: dto.telefone || null,
        consentimentos: {
          create: [
            { finalidade: 'TERMOS_E_PRIVACIDADE', versaoTermo: VERSAO_TERMOS },
            ...(dto.aceiteMarketing ? [{ finalidade: 'MARKETING', versaoTermo: VERSAO_TERMOS }] : []),
          ],
        },
      },
    });
    await this.audit.registrar({ usuarioId: u.id, acao: 'CADASTRO', entidade: 'usuario', entidadeId: u.id, ip });
    return this.emitirSessao(u, res);
  }

  async login(email: string, senha: string, res: Response, ip?: string) {
    const msg = 'E-mail ou senha inválidos, ou acesso temporariamente bloqueado.';
    const u = await this.prisma.usuario.findUnique({ where: { email } });
    const hash = u && !u.removidoEm ? u.senhaHash : await this.getDummyHash();
    const ok = await argon2.verify(hash, senha).catch(() => false);

    if (!u || u.removidoEm) throw new UnauthorizedException(msg);
    if (u.bloqueadoAte && u.bloqueadoAte > new Date()) throw new UnauthorizedException(msg);

    if (!ok) {
      const tentativas = u.tentativasLogin + 1;
      const bloquear = tentativas >= MAX_TENTATIVAS;
      await this.prisma.usuario.update({
        where: { id: u.id },
        data: { tentativasLogin: bloquear ? 0 : tentativas, bloqueadoAte: bloquear ? new Date(Date.now() + BLOQUEIO_MIN * 60_000) : null },
      });
      if (bloquear) await this.audit.registrar({ usuarioId: u.id, acao: 'LOGIN_BLOQUEADO', entidade: 'usuario', entidadeId: u.id, ip });
      throw new UnauthorizedException(msg);
    }
    const atualizado = await this.prisma.usuario.update({ where: { id: u.id }, data: { tentativasLogin: 0, bloqueadoAte: null } });
    return this.emitirSessao(atualizado, res);
  }

  /** Renovação com rotação do refresh token e detecção de reutilização. */
  async refresh(token: string | undefined, res: Response) {
    const limpar = () => res.clearCookie(COOKIE_REFRESH, { path: '/api/v1/auth' });
    if (!token) throw new UnauthorizedException('Sessão expirada.');
    const rt = await this.prisma.refreshToken.findUnique({ where: { tokenHash: sha256(token) }, include: { usuario: true } });
    if (!rt) { limpar(); throw new UnauthorizedException('Sessão expirada.'); }
    if (rt.revogadoEm) {
      // Reutilização de token já rotacionado: possível roubo. Encerra todas as sessões.
      await this.prisma.refreshToken.updateMany({ where: { usuarioId: rt.usuarioId, revogadoEm: null }, data: { revogadoEm: new Date() } });
      await this.audit.registrar({ usuarioId: rt.usuarioId, acao: 'REFRESH_REUTILIZADO', entidade: 'usuario', entidadeId: rt.usuarioId });
      limpar();
      throw new UnauthorizedException('Sessão expirada.');
    }
    if (rt.expiraEm < new Date() || rt.usuario.removidoEm) { limpar(); throw new UnauthorizedException('Sessão expirada.'); }
    await this.prisma.refreshToken.update({ where: { id: rt.id }, data: { revogadoEm: new Date() } });
    return this.emitirSessao(rt.usuario, res);
  }

  async logout(token: string | undefined, res: Response) {
    if (token) await this.prisma.refreshToken.updateMany({ where: { tokenHash: sha256(token), revogadoEm: null }, data: { revogadoEm: new Date() } });
    res.clearCookie(COOKIE_REFRESH, { path: '/api/v1/auth' });
  }

  async me(id: number) {
    const u = await this.prisma.usuario.findUnique({ where: { id } });
    if (!u || u.removidoEm) throw new UnauthorizedException('Sessão expirada.');
    return this.publico(u);
  }

  async recuperarSenha(email: string) {
    // Sempre responde igual, exista ou não o e-mail (não revela cadastros).
    const u = await this.prisma.usuario.findUnique({ where: { email } });
    if (!u || u.removidoEm) return;
    const token = randomBytes(32).toString('base64url');
    await this.prisma.tokenRedefinicao.create({
      data: { usuarioId: u.id, tokenHash: sha256(token), expiraEm: new Date(Date.now() + 30 * 60_000) },
    });
    await this.mail.redefinirSenha(u.email, u.nome, `${this.cfg.get('APP_URL')}/redefinir-senha?token=${token}`);
  }

  async redefinirSenha(token: string, senha: string) {
    const t = await this.prisma.tokenRedefinicao.findUnique({ where: { tokenHash: sha256(token) }, include: { usuario: true } });
    if (!t || t.usadoEm || t.expiraEm < new Date() || t.usuario.removidoEm) {
      throw new BadRequestException('Link inválido ou expirado. Solicite um novo.');
    }
    const erros = validarSenha(senha, t.usuario.email);
    if (erros.length) throw new BadRequestException({ mensagem: 'Senha fraca', erros: erros.map((m) => ({ campo: 'senha', mensagem: m })) });
    const senhaHash = await this.hash(senha);
    await this.prisma.$transaction([
      this.prisma.usuario.update({ where: { id: t.usuarioId }, data: { senhaHash, tentativasLogin: 0, bloqueadoAte: null } }),
      this.prisma.tokenRedefinicao.update({ where: { id: t.id }, data: { usadoEm: new Date() } }),
      this.prisma.refreshToken.updateMany({ where: { usuarioId: t.usuarioId, revogadoEm: null }, data: { revogadoEm: new Date() } }),
    ]);
    await this.audit.registrar({ usuarioId: t.usuarioId, acao: 'SENHA_REDEFINIDA', entidade: 'usuario', entidadeId: t.usuarioId });
  }

  /** LGPD art. 18: acesso aos dados do titular. */
  async exportarDados(id: number) {
    const u = await this.prisma.usuario.findUnique({
      where: { id },
      select: {
        id: true, nome: true, email: true, telefone: true, perfil: true, criadoEm: true,
        consentimentos: { select: { finalidade: true, versaoTermo: true, concedido: true, criadoEm: true } },
        enderecos: true,
        pedidos: { include: { itens: true, endereco: true, envio: true } },
      },
    });
    if (!u) throw new UnauthorizedException();
    return u;
  }

  /** LGPD art. 18: eliminação. Dados de pedidos são mantidos pelo prazo legal, desvinculados da identidade. */
  async excluirConta(id: number, res: Response, ip?: string) {
    const aberto = await this.prisma.pedido.count({ where: { usuarioId: id, status: { in: ['AGUARDANDO_PAGAMENTO', 'PAGO', 'EM_SEPARACAO', 'ENVIADO', 'PRONTO_RETIRADA'] } } });
    if (aberto > 0) throw new ConflictException('Há pedidos em andamento. Conclua-os ou cancele antes de excluir a conta.');
    const senhaHash = await this.hash(randomBytes(24).toString('hex'));
    await this.prisma.$transaction([
      this.prisma.usuario.update({ where: { id }, data: { nome: 'Usuário removido', email: `removido-${id}@invalid.local`, telefone: null, senhaHash, removidoEm: new Date() } }),
      this.prisma.refreshToken.updateMany({ where: { usuarioId: id, revogadoEm: null }, data: { revogadoEm: new Date() } }),
      this.prisma.carrinho.deleteMany({ where: { usuarioId: id } }),
      this.prisma.consentimento.deleteMany({ where: { usuarioId: id } }),
      this.prisma.endereco.deleteMany({ where: { usuarioId: id, pedidos: { none: {} } } }),
    ]);
    await this.audit.registrar({ usuarioId: id, acao: 'CONTA_EXCLUIDA', entidade: 'usuario', entidadeId: id, ip });
    res.clearCookie(COOKIE_REFRESH, { path: '/api/v1/auth' });
  }
}
