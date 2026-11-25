export const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const dataBR = (iso: string | Date) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
export const dataHoraBR = (iso: string | Date) => new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
export const cepMask = (v: string) => { const d = v.replace(/\D/g, '').slice(0, 8); return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d; };
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export const ROTULO_STATUS: Record<string, string> = {
  AGUARDANDO_PAGAMENTO: 'Aguardando pagamento', PAGO: 'Pago', EM_SEPARACAO: 'Em separação', ENVIADO: 'Enviado',
  PRONTO_RETIRADA: 'Pronto para retirada', CONCLUIDO: 'Concluído', CANCELADO: 'Cancelado',
};
export const COR_STATUS: Record<string, 'roxo' | 'ouro' | 'ok' | 'erro' | 'cinza'> = {
  AGUARDANDO_PAGAMENTO: 'ouro', PAGO: 'roxo', EM_SEPARACAO: 'roxo', ENVIADO: 'ok', PRONTO_RETIRADA: 'ok', CONCLUIDO: 'ok', CANCELADO: 'erro',
};
export const SITUACAO_ESTOQUE: Record<string, { rotulo: string; cor: 'ok' | 'ouro' | 'erro' }> = {
  NORMAL: { rotulo: 'Normal', cor: 'ok' }, BAIXO: { rotulo: 'Estoque baixo', cor: 'ouro' }, SEM_ESTOQUE: { rotulo: 'Sem estoque', cor: 'erro' },
};
