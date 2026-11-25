/** Máquina de estados do pedido (Etapa 4, seção 6.3). */
export const STATUS_PEDIDO = [
  'AGUARDANDO_PAGAMENTO',
  'PAGO',
  'EM_SEPARACAO',
  'ENVIADO',
  'PRONTO_RETIRADA',
  'CONCLUIDO',
  'CANCELADO',
] as const;
export type StatusPedido = (typeof STATUS_PEDIDO)[number];
export type TipoEntrega = 'ENVIO' | 'RETIRADA';

const TRANSICOES: Record<StatusPedido, StatusPedido[]> = {
  AGUARDANDO_PAGAMENTO: ['PAGO', 'CANCELADO'],
  PAGO: ['EM_SEPARACAO', 'CANCELADO'],
  EM_SEPARACAO: ['ENVIADO', 'PRONTO_RETIRADA', 'CANCELADO'],
  ENVIADO: ['CONCLUIDO'],
  PRONTO_RETIRADA: ['CONCLUIDO'],
  CONCLUIDO: [],
  CANCELADO: [],
};

/** Próximos estados válidos, respeitando o tipo de entrega. */
export function proximosStatus(atual: StatusPedido, tipo: TipoEntrega): StatusPedido[] {
  return TRANSICOES[atual].filter((s) => {
    if (tipo === 'ENVIO' && s === 'PRONTO_RETIRADA') return false;
    if (tipo === 'RETIRADA' && s === 'ENVIADO') return false;
    return true;
  });
}

export function podeTransicionar(atual: StatusPedido, novo: StatusPedido, tipo: TipoEntrega): boolean {
  return proximosStatus(atual, tipo).includes(novo);
}

/** Cancelar um pedido devolve o estoque reservado. */
export function liberaEstoque(novo: StatusPedido): boolean {
  return novo === 'CANCELADO';
}

/** Rótulos exibidos ao cliente (no protótipo, o pedido pago aparece como "Recebido"). */
export const ROTULO_CLIENTE: Record<StatusPedido, string> = {
  AGUARDANDO_PAGAMENTO: 'Aguardando pagamento',
  PAGO: 'Recebido',
  EM_SEPARACAO: 'Em separação',
  ENVIADO: 'Enviado',
  PRONTO_RETIRADA: 'Pronto para retirada',
  CONCLUIDO: 'Concluído',
  CANCELADO: 'Cancelado',
};

export interface EtapaRastreamento {
  codigo: StatusPedido;
  rotulo: string;
  concluida: boolean;
  atual: boolean;
}

/** Etapas da linha do tempo mostrada na tela de acompanhamento. */
export function etapasRastreamento(status: StatusPedido, tipo: TipoEntrega): EtapaRastreamento[] {
  const ordem: StatusPedido[] =
    tipo === 'ENVIO'
      ? ['PAGO', 'EM_SEPARACAO', 'ENVIADO']
      : ['PAGO', 'EM_SEPARACAO', 'PRONTO_RETIRADA'];
  const finalizado = status === 'CONCLUIDO';
  const idx = finalizado ? ordem.length : ordem.indexOf(status);
  return ordem.map((codigo, i) => ({
    codigo,
    rotulo: ROTULO_CLIENTE[codigo],
    concluida: finalizado || (idx >= 0 && i < idx) || (idx === i && i === ordem.length - 1),
    atual: !finalizado && idx === i,
  }));
}
