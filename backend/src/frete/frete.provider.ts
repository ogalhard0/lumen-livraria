import { cotarFlat, toCents, type OpcaoFrete } from '../domain';

export interface PacoteFrete {
  cepDestino: string;
  pesoGramas: number;
  alturaCm: number;
  larguraCm: number;
  comprimentoCm: number;
  valorSeguroCents: number;
  itens: { id: number; quantidade: number; pesoGramas: number; alturaCm: number; larguraCm: number; comprimentoCm: number; valorCents: number }[];
}

export interface FreteProvider {
  cotar(p: PacoteFrete): Promise<OpcaoFrete[]>;
}

export const FRETE_PROVIDER = 'FRETE_PROVIDER';

/** Tabela de referência (desenvolvimento ou operação sem agregador). */
export class FlatFreteProvider implements FreteProvider {
  async cotar(p: PacoteFrete): Promise<OpcaoFrete[]> {
    return cotarFlat(p.cepDestino, p.pesoGramas);
  }
}

/**
 * Agregador Melhor Envio (cotação por CEP).
 * ATENÇÃO: valide o formato de requisição/resposta no ambiente sandbox do provedor antes de ir a produção.
 */
export class MelhorEnvioProvider implements FreteProvider {
  constructor(
    private baseUrl: string,
    private token: string,
    private cepOrigem: string,
    private contato: string,
  ) {}

  async cotar(p: PacoteFrete): Promise<OpcaoFrete[]> {
    const resp = await fetch(`${this.baseUrl.replace(/\/$/, '')}/api/v2/me/shipment/calculate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': `Lumen Livraria (${this.contato})`,
      },
      body: JSON.stringify({
        from: { postal_code: this.cepOrigem },
        to: { postal_code: p.cepDestino },
        products: p.itens.map((i) => ({
          id: String(i.id),
          width: i.larguraCm,
          height: i.alturaCm,
          length: i.comprimentoCm,
          weight: i.pesoGramas / 1000,
          insurance_value: i.valorCents / 100,
          quantity: i.quantidade,
        })),
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) throw new Error(`Melhor Envio respondeu ${resp.status}`);
    const dados = (await resp.json()) as Array<{ id: number; name: string; price?: string; custom_price?: string; delivery_time?: number; company?: { name?: string }; error?: string }>;
    return dados
      .filter((d) => !d.error && (d.custom_price ?? d.price))
      .map((d) => ({
        codigo: `ME-${d.id}`,
        nome: `${d.company?.name ?? ''} ${d.name}`.trim(),
        precoCents: toCents(d.custom_price ?? d.price ?? '0'),
        prazoDias: d.delivery_time ?? 0,
      }))
      .sort((a, b) => a.precoCents - b.precoCents);
  }
}
