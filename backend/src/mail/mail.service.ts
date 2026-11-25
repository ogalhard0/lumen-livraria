import { Injectable, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Env } from '../config/env';
import { formatBRL } from '../domain';

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

export interface ResumoPedidoEmail {
  numero: string;
  nome: string;
  totalCents: number;
  itens: { titulo: string; quantidade: number }[];
  retirada: boolean;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger('Mail');
  private transporter: nodemailer.Transporter | null = null;

  constructor(private cfg: ConfigService<Env, true>) {
    if (cfg.get('MAIL_TRANSPORT') === 'smtp') {
      this.transporter = nodemailer.createTransport({
        host: cfg.get('SMTP_HOST'),
        port: cfg.get('SMTP_PORT'),
        secure: cfg.get('SMTP_PORT') === 465,
        auth: { user: cfg.get('SMTP_USER'), pass: cfg.get('SMTP_PASS') },
      });
    }
  }

  private layout(titulo: string, corpo: string): string {
    return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#1F1A2B">
      <div style="background:#4A2C7A;padding:20px;text-align:center"><span style="color:#E6CB6E;font-size:22px;font-weight:bold">✝ Lumen</span><br><span style="color:#fff;font-size:12px;letter-spacing:2px">LIVRARIA CATÓLICA</span></div>
      <div style="padding:24px"><h2 style="color:#4A2C7A">${esc(titulo)}</h2>${corpo}</div>
      <div style="background:#F7F3FC;padding:14px;text-align:center;font-size:12px;color:#5E566E">Fé que ilumina. Palavras que transformam.</div></div>`;
  }

  async enviar(para: string, assunto: string, html: string, texto: string) {
    if (!this.transporter) {
      // Modo desenvolvimento: imprime no terminal. Não use em produção (pode conter links de acesso).
      this.logger.log(`[e-mail simulado] Para: ${para} | Assunto: ${assunto}\n${texto}`);
      return;
    }
    try {
      await this.transporter.sendMail({ from: this.cfg.get('MAIL_FROM'), to: para, subject: assunto, html, text: texto });
    } catch (e) {
      this.logger.error(`Falha ao enviar e-mail (${assunto}): ${(e as Error).message}`);
    }
  }

  async redefinirSenha(para: string, nome: string, link: string) {
    const html = this.layout('Redefinição de senha', `<p>Olá, ${esc(nome)}.</p><p>Recebemos um pedido para redefinir sua senha. O link abaixo vale por 30 minutos e só pode ser usado uma vez.</p><p><a href="${esc(link)}" style="background:#C9A227;color:#2A1650;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">Criar nova senha</a></p><p style="font-size:12px;color:#5E566E">Se não foi você, ignore este e-mail.</p>`);
    await this.enviar(para, 'Redefinição de senha – Lumen', html, `Olá, ${nome}. Para criar uma nova senha (válido por 30 minutos): ${link}`);
  }

  async confirmacaoPedido(para: string, r: ResumoPedidoEmail) {
    const linhas = r.itens.map((i) => `<li>${i.quantidade}× ${esc(i.titulo)}</li>`).join('');
    const html = this.layout('Pedido recebido!', `<p>Obrigado, ${esc(r.nome)}! Recebemos o seu pedido <b>${esc(r.numero)}</b> e o pagamento foi confirmado.</p><ul>${linhas}</ul><p><b>Total: ${formatBRL(r.totalCents)}</b></p><p>${r.retirada ? 'Avisaremos quando estiver pronto para retirada na loja.' : 'Avisaremos quando for enviado, com o código de rastreamento.'}</p>`);
    await this.enviar(para, `Pedido ${r.numero} recebido – Lumen`, html, `Pedido ${r.numero} recebido. Total: ${formatBRL(r.totalCents)}.`);
  }

  async pedidoEnviado(para: string, nome: string, numero: string, rastreio?: string | null, transportadora?: string | null) {
    const extra = rastreio ? `<p>Rastreamento${transportadora ? ` (${esc(transportadora)})` : ''}: <b>${esc(rastreio)}</b></p>` : '';
    const html = this.layout('Seu pedido foi enviado', `<p>Olá, ${esc(nome)}! O pedido <b>${esc(numero)}</b> está a caminho.</p>${extra}`);
    await this.enviar(para, `Pedido ${numero} enviado – Lumen`, html, `Pedido ${numero} enviado.${rastreio ? ` Rastreio: ${rastreio}` : ''}`);
  }

  async prontoRetirada(para: string, nome: string, numero: string) {
    const html = this.layout('Pronto para retirada', `<p>Olá, ${esc(nome)}! O pedido <b>${esc(numero)}</b> já pode ser retirado na loja. Leve um documento com foto.</p>`);
    await this.enviar(para, `Pedido ${numero} pronto para retirada – Lumen`, html, `Pedido ${numero} pronto para retirada.`);
  }

  async pedidoCancelado(para: string, nome: string, numero: string) {
    const html = this.layout('Pedido cancelado', `<p>Olá, ${esc(nome)}. O pedido <b>${esc(numero)}</b> foi cancelado. Se já houve pagamento, entraremos em contato sobre o estorno.</p>`);
    await this.enviar(para, `Pedido ${numero} cancelado – Lumen`, html, `Pedido ${numero} cancelado.`);
  }
}

@Module({ providers: [MailService], exports: [MailService] })
export class MailModule {}
