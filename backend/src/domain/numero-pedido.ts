export function formatarNumeroPedido(id: number): string {
  return `LUM-${String(id).padStart(6, '0')}`;
}

export function numeroPedidoValido(n: string): boolean {
  return /^LUM-\d{6,}$/.test(n);
}
