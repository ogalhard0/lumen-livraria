import { createHmac, timingSafeEqual } from 'node:crypto';

/** Verificação da assinatura (x-signature) das notificações do Mercado Pago. */
export function parseXSignature(header: string | undefined): { ts?: string; v1?: string } {
  const out: { ts?: string; v1?: string } = {};
  for (const parte of (header ?? '').split(',')) {
    const [k, v] = parte.split('=').map((s) => s.trim());
    if (k === 'ts') out.ts = v;
    if (k === 'v1') out.v1 = v;
  }
  return out;
}

export function verificarAssinaturaMP(p: {
  xSignature?: string;
  xRequestId?: string;
  dataId?: string;
  secret: string;
}): boolean {
  const { ts, v1 } = parseXSignature(p.xSignature);
  if (!ts || !v1 || !p.secret) return false;
  let manifest = '';
  if (p.dataId) manifest += `id:${p.dataId.toLowerCase()};`;
  if (p.xRequestId) manifest += `request-id:${p.xRequestId};`;
  manifest += `ts:${ts};`;
  const esperado = createHmac('sha256', p.secret).update(manifest).digest('hex');
  const a = Buffer.from(esperado, 'utf8');
  const b = Buffer.from(v1, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}
