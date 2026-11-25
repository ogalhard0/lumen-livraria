'use client';
import { useEffect, useState } from 'react';
import { Aviso, Button, Carregando } from './ui';
import { api, ApiError } from '@/lib/http';
import type { PagamentoResp } from '@/lib/types';

export function PixPayment({ numero, onAtualizar }: { numero: string; onAtualizar: () => void }) {
  const [pag, setPag] = useState<PagamentoResp | null>(null);
  const [erro, setErro] = useState('');
  const [copiado, setCopiado] = useState(false);
  const dev = !process.env.NEXT_PUBLIC_MP_PUBLIC_KEY;

  useEffect(() => {
    let vivo = true;
    api<PagamentoResp>('/pagamentos/pix', { method: 'POST', body: { numeroPedido: numero } })
      .then((p) => vivo && setPag(p))
      .catch((e) => vivo && setErro(e instanceof ApiError ? e.message : 'Não foi possível gerar o Pix.'));
    return () => { vivo = false; };
  }, [numero]);

  if (erro) return <Aviso tipo="erro">{erro}</Aviso>;
  if (!pag) return <Carregando texto="Gerando o Pix…" />;

  return (
    <div className="space-y-4">
      <p className="text-tinta-600">Abra o aplicativo do seu banco, escolha pagar com Pix e escaneie o QR Code ou use o código “copia e cola”. A confirmação é automática.</p>
      {pag.pixQrBase64 && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`data:image/png;base64,${pag.pixQrBase64}`} alt="QR Code do Pix" className="mx-auto h-56 w-56 rounded-xl border-4 border-ouro-500 p-2" />
      )}
      {pag.pixCopiaCola && (
        <div>
          <label htmlFor="pix" className="text-sm font-semibold">Pix copia e cola</label>
          <div className="mt-1 flex gap-2">
            <input id="pix" readOnly value={pag.pixCopiaCola} className="w-full truncate rounded-xl border border-tinta-300 bg-roxo-50 px-3 py-3 text-sm" onFocus={(e) => e.currentTarget.select()} />
            <Button variante="ouro" onClick={() => { navigator.clipboard?.writeText(pag.pixCopiaCola ?? ''); setCopiado(true); setTimeout(() => setCopiado(false), 2000); }}>{copiado ? 'Copiado!' : 'Copiar'}</Button>
          </div>
        </div>
      )}
      <p className="text-sm text-tinta-600" role="status">Aguardando pagamento… esta página atualiza sozinha.</p>
      {dev && (
        <div className="rounded-xl border-2 border-dashed border-ouro-500 p-3">
          <p className="mb-2 text-xs font-semibold text-ouro-700">MODO DE DESENVOLVIMENTO (provedor de pagamento simulado)</p>
          <Button variante="contorno" onClick={() => api(`/pagamentos/${pag.id}/simular-aprovacao`, { method: 'POST' }).then(onAtualizar).catch(() => {})}>Simular pagamento aprovado</Button>
        </div>
      )}
    </div>
  );
}
