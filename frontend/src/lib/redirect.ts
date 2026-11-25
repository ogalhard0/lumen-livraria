/** Aceita apenas caminhos internos (evita redirecionamento aberto). */
export function destinoSeguro(next: string | null | undefined, padrao = '/'): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.includes('\\')) return padrao;
  return next;
}
