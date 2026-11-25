import { createHash, randomUUID } from 'node:crypto';
import type { StatusPagamento } from '@prisma/client';

export interface ResultadoPagamento {
  idGateway: string;
  status: StatusPagamento;
  pixCopiaCola?: string;
  pixQrBase64?: string;
}

export interface PagamentoProvider {
  readonly nome: 'fake' | 'mercadopago';
  criarPix(p: { numero: string; valorCents: number; descricao: string; email: string; expiraEm: Date }): Promise<ResultadoPagamento>;
  criarCartao(p: {
    numero: string; valorCents: number; descricao: string; email: string; token: string;
    parcelas: number; paymentMethodId: string; issuerId?: string; documento?: string;
  }): Promise<ResultadoPagamento>;
  consultar(idGateway: string): Promise<StatusPagamento>;
}

export const PAGAMENTO_PROVIDER = 'PAGAMENTO_PROVIDER';

/** Somente desenvolvimento (bloqueado em produção pela validação de ambiente). */
export class FakePagamentoProvider implements PagamentoProvider {
  readonly nome = 'fake' as const;

  async criarPix(p: { numero: string }): Promise<ResultadoPagamento> {
    const id = `fake-${randomUUID()}`;
    return { idGateway: id, status: 'PENDENTE', pixCopiaCola: `00020126FAKE${p.numero}${id}`, pixQrBase64: undefined };
  }

  async criarCartao(p: { token: string }): Promise<ResultadoPagamento> {
    return { idGateway: `fake-${randomUUID()}`, status: p.token === 'tok_recusado' ? 'RECUSADO' : 'APROVADO' };
  }

  async consultar(): Promise<StatusPagamento> {
    return 'PENDENTE';
  }
}

export function mapearStatusMP(s?: string): StatusPagamento {
  switch (s) {
    case 'approved': return 'APROVADO';
    case 'rejected': return 'RECUSADO';
    case 'cancelled': return 'CANCELADO';
    case 'refunded':
    case 'charged_back': return 'ESTORNADO';
    default: return 'PENDENTE'; // pending, in_process, authorized...
  }
}

/**
 * Integração com o Mercado Pago (API de Pagamentos).
 * O número do cartão nunca passa pelo nosso servidor: o navegador envia apenas o token gerado pelo Brick do provedor.
 * ATENÇÃO: valide os fluxos no ambiente de testes do provedor (credenciais de teste) antes de ir a produção.
 */
export class MercadoPagoProvider implements PagamentoProvider {
  readonly nome = 'mercadopago' as const;
  private base = 'https://api.mercadopago.com';

  constructor(private accessToken: string, private notificationUrl?: string) {}

  private async chamar<T>(caminho: string, init: { method: 'GET' | 'POST'; body?: unknown; idempotencia?: string }): Promise<T> {
    const r = await fetch(`${this.base}${caminho}`, {
      method: init.method,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...(init.idempotencia ? { 'X-Idempotency-Key': init.idempotencia } : {}),
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
      signal: AbortSignal.timeout(12_000),
    });
    if (!r.ok) throw new Error(`Mercado Pago respondeu ${r.status}`);
    return (await r.json()) as T;
  }

  async criarPix(p: { numero: string; valorCents: number; descricao: string; email: string; expiraEm: Date }): Promise<ResultadoPagamento> {
    // Brasília (UTC-3, sem horário de verão): o provedor espera o deslocamento explícito.
    const expira = new Date(p.expiraEm.getTime() - 3 * 3600_000).toISOString().replace('Z', '-03:00');
    const d = await this.chamar<{ id: number; status: string; point_of_interaction?: { transaction_data?: { qr_code?: string; qr_code_base64?: string } } }>('/v1/payments', {
      method: 'POST',
      idempotencia: `${p.numero}-pix`,
      body: {
        transaction_amount: p.valorCents / 100,
        description: p.descricao,
        payment_method_id: 'pix',
        payer: { email: p.email },
        external_reference: p.numero,
        date_of_expiration: expira,
        ...(this.notificationUrl ? { notification_url: this.notificationUrl } : {}),
      },
    });
    const td = d.point_of_interaction?.transaction_data;
    return { idGateway: String(d.id), status: mapearStatusMP(d.status), pixCopiaCola: td?.qr_code, pixQrBase64: td?.qr_code_base64 };
  }

  async criarCartao(p: {
    numero: string; valorCents: number; descricao: string; email: string; token: string;
    parcelas: number; paymentMethodId: string; issuerId?: string; documento?: string;
  }): Promise<ResultadoPagamento> {
    const d = await this.chamar<{ id: number; status: string }>('/v1/payments', {
      method: 'POST',
      idempotencia: `${p.numero}-cartao-${createHash('sha256').update(p.token).digest('hex').slice(0, 16)}`,
      body: {
        transaction_amount: p.valorCents / 100,
        token: p.token,
        description: p.descricao,
        installments: p.parcelas,
        payment_method_id: p.paymentMethodId,
        ...(p.issuerId ? { issuer_id: Number(p.issuerId) } : {}),
        payer: { email: p.email, ...(p.documento ? { identification: { type: p.documento.length === 14 ? 'CNPJ' : 'CPF', number: p.documento } } : {}) },
        external_reference: p.numero,
        ...(this.notificationUrl ? { notification_url: this.notificationUrl } : {}),
      },
    });
    return { idGateway: String(d.id), status: mapearStatusMP(d.status) };
  }

  /** Sempre consultamos o provedor: o corpo da notificação nunca é confiável por si só. */
  async consultar(idGateway: string): Promise<StatusPagamento> {
    const d = await this.chamar<{ status: string }>(`/v1/payments/${encodeURIComponent(idGateway)}`, { method: 'GET' });
    return mapearStatusMP(d.status);
  }
}
