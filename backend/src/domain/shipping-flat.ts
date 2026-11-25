/**
 * Tabela de frete de referência para desenvolvimento e para operar sem agregador.
 * Os valores são ilustrativos: em produção, use SHIPPING_PROVIDER=melhorenvio.
 */
export type Regiao = 'LOCAL' | 'SP' | 'SUDESTE' | 'SUL' | 'CENTRO_OESTE' | 'NORDESTE' | 'NORTE';

export interface OpcaoFrete {
  codigo: string;
  nome: string;
  precoCents: number;
  prazoDias: number;
}

export function normalizarCep(v: string): string | null {
  const d = (v ?? '').replace(/\D/g, '');
  return d.length === 8 ? d : null;
}

export function formatarCep(d: string): string {
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

export function regiaoPorCep(cep: string): Regiao {
  const d = normalizarCep(cep);
  if (!d) throw new Error('CEP inválido');
  if (d.startsWith('125')) return 'LOCAL'; // Guaratinguetá e arredores
  switch (d[0]) {
    case '0':
    case '1':
      return 'SP';
    case '2':
    case '3':
      return 'SUDESTE';
    case '4':
    case '5':
      return 'NORDESTE';
    case '6':
      return 'NORTE';
    case '7':
      return 'CENTRO_OESTE';
    default:
      return 'SUL'; // 8 e 9
  }
}

// faixas de peso: até 300 g, 1 kg, 2 kg e 5 kg
const TABELA: Record<Regiao, { precos: [number, number, number, number]; prazo: number }> = {
  LOCAL: { precos: [1200, 1500, 1900, 2500], prazo: 2 },
  SP: { precos: [1500, 1900, 2400, 3200], prazo: 3 },
  SUDESTE: { precos: [1900, 2400, 3000, 4000], prazo: 4 },
  SUL: { precos: [2300, 2900, 3600, 4700], prazo: 6 },
  CENTRO_OESTE: { precos: [2600, 3200, 4000, 5200], prazo: 7 },
  NORDESTE: { precos: [2900, 3600, 4500, 5900], prazo: 8 },
  NORTE: { precos: [3300, 4100, 5100, 6500], prazo: 10 },
};

export function cotarFlat(cep: string, pesoGramas: number): OpcaoFrete[] {
  if (!(pesoGramas > 0)) throw new RangeError('Peso inválido');
  const { precos, prazo } = TABELA[regiaoPorCep(cep)];
  let base: number;
  if (pesoGramas <= 300) base = precos[0];
  else if (pesoGramas <= 1000) base = precos[1];
  else if (pesoGramas <= 2000) base = precos[2];
  else if (pesoGramas <= 5000) base = precos[3];
  else base = precos[3] + Math.ceil((pesoGramas - 5000) / 1000) * 500;
  return [
    { codigo: 'ECONOMICO', nome: 'Entrega econômica', precoCents: base, prazoDias: prazo },
    { codigo: 'EXPRESSO', nome: 'Entrega expressa', precoCents: Math.round(base * 1.6), prazoDias: Math.max(1, prazo - 2) },
  ];
}

/** Frete grátis na opção mais barata quando o subtotal atinge o limite configurado. */
export function aplicarFreteGratis(opcoes: OpcaoFrete[], subtotalCents: number, limiteCents?: number): OpcaoFrete[] {
  if (!limiteCents || subtotalCents < limiteCents || !opcoes.length) return opcoes;
  const maisBarata = opcoes.reduce((a, b) => (b.precoCents < a.precoCents ? b : a));
  return opcoes.map((o) => (o === maisBarata ? { ...o, precoCents: 0, nome: `${o.nome} (frete grátis)` } : o));
}
