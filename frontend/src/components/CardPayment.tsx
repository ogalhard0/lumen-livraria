'use client';
import { useEffect, useRef, useState } from 'react';
import { Aviso, Button } from './ui';
import { api, ApiError } from '@/lib/http';

declare global { interface Window { MercadoPago?: any } }
const CHAVE_PUBLICA = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY;

/**
 * Cartão: os dados são digitados em campos seguros do provedor (Brick) e o servidor recebe apenas o token.
 * Sem chave pública configurada, usa o modo de desenvolvimento (simulado).
 */
export function CardPayment({ numero, total, onAtualizar }: { numero: string; total: number; onAtualizar: () => void }) {
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const montado = useRef(false);

  const enviar = async (corpo: Record<string, unknown>) => {
    setErro(''); setCarregando(true);
    try {
      const r = await api<{ status: string }>('/pagamentos/cartao', { method: 'POST', body: { numeroPedido: numero, ...corpo } });
      if (r.status === 'RECUSADO') setErro('Pagamento recusado. Confira os dados ou tente outro cartão.');
      onAtualizar();
    } catch (e) { setErro(e instanceof ApiError ? e.message : 'Não foi possível processar o pagamento.'); }
    finally { setCarregando(false); }
  };

  useEffect(() => {
    if (!CHAVE_PUBLICA || montado.current) return;
    montado.current = true;
    const s = document.createElement('script');
    s.src = 'https://sdk.mercadopago.com/js/v2';
    s.async = true;
    s.onload = async () => {
      const mp = new window.MercadoPago!(CHAVE_PUBLICA, { locale: 'pt-BR' });
      await mp.bricks().create('cardPayment', 'cartao-brick', {
        initialization: { amount: total },
        customization: { paymentMethods: { maxInstallments: 3 } },
        callbacks: {
          onReady: () => {},
          onSubmit: (d: any) => enviar({
            token: d.token, paymentMethodId: d.payment_method_id,
            issuerId: d.issuer_id ? String(d.issuer_id) : undefined, parcelas: Number(d.installments) || 1,
            documento: d.payer?.identification?.number,
          }),
          onError: () => setErro('Não foi possível carregar o formulário de cartão.'),
        },
      });
    };
    s.onerror = () => setErro('Não foi possível carregar o provedor de pagamento.');
    document.body.appendChild(s);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!CHAVE_PUBLICA) {
    return (
      <div className="space-y-3 rounded-xl border-2 border-dashed border-ouro-500 p-4">
        <p className="text-xs font-semibold text-ouro-700">MODO DE DESENVOLVIMENTO (cartão simulado: nenhum dado real é coletado)</p>
        {erro && <Aviso tipo="erro">{erro}</Aviso>}
        <div className="flex flex-wrap gap-3">
          <Button disabled={carregando} onClick={() => enviar({ token: 'tok_aprovado', paymentMethodId: 'visa', parcelas: 1 })}>Pagar (simulação aprovada)</Button>
          <Button variante="contorno" disabled={carregando} onClick={() => enviar({ token: 'tok_recusado', paymentMethodId: 'visa', parcelas: 1 })}>Simular recusa</Button>
        </div>
      </div>
    );
  }
  return (
    <div>
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      <div id="cartao-brick" className="mt-3" />
      {carregando && <p role="status" className="mt-2 text-sm text-tinta-600">Processando pagamento…</p>}
    </div>
  );
}
