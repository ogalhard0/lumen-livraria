'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { CardPayment } from '@/components/CardPayment';
import { PixPayment } from '@/components/PixPayment';
import { Aviso, Button, Carregando, Cruz, LinkButton, Selo } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { api, ApiError } from '@/lib/http';
import { brl, dataBR, dataHoraBR } from '@/lib/format';
import type { Pedido } from '@/lib/types';

function Contagem({ ate }: { ate: string }) {
  const [resta, setResta] = useState(() => new Date(ate).getTime() - Date.now());
  useEffect(() => { const t = setInterval(() => setResta(new Date(ate).getTime() - Date.now()), 1000); return () => clearInterval(t); }, [ate]);
  if (resta <= 0) return <span className="font-bold text-erro">expirado</span>;
  const m = Math.floor(resta / 60000), s = Math.floor((resta % 60000) / 1000);
  return <span className="font-bold tabular-nums">{m}:{String(s).padStart(2, '0')}</span>;
}

export default function PedidoPage() {
  const { numero } = useParams<{ numero: string }>();
  const router = useRouter();
  const { usuario, carregando } = useAuth();
  const [metodo, setMetodo] = useState<'PIX' | 'CARTAO'>('PIX');

  useEffect(() => { if (!carregando && !usuario) router.replace(`/login?next=/pedido/${numero}`); }, [carregando, usuario, numero, router]);

  const q = useQuery({
    queryKey: ['pedido', numero],
    queryFn: () => api<Pedido>(`/pedidos/${numero}`),
    enabled: !!usuario,
    refetchInterval: (query) => (query.state.data?.status === 'AGUARDANDO_PAGAMENTO' ? 5000 : false), // acompanha a confirmação do Pix
  });

  if (carregando || !usuario || q.isLoading) return <Carregando />;
  if (q.isError) return <div className="container-lumen py-16"><Aviso tipo="erro">{q.error instanceof ApiError ? q.error.message : 'Pedido não encontrado.'}</Aviso></div>;
  const p = q.data!;
  const aguardando = p.status === 'AGUARDANDO_PAGAMENTO';

  async function cancelar() {
    if (!confirm('Cancelar este pedido? Os itens voltarão ao estoque.')) return;
    await api(`/pedidos/${numero}/cancelar`, { method: 'POST' }).catch(() => {});
    q.refetch();
  }

  return (
    <div className="container-lumen max-w-3xl py-10">
      {p.status === 'CANCELADO' ? (
        <div className="text-center"><h1 className="text-3xl">Pedido cancelado</h1><p className="mt-2 text-tinta-600">O pedido {p.numero} foi cancelado.</p></div>
      ) : aguardando ? (
        <div className="text-center"><h1 className="text-3xl">Quase lá! Falta o pagamento</h1><p className="mt-2 text-tinta-600">Pedido <strong>{p.numero}</strong> · reservado por <Contagem ate={p.expiraEm} /></p></div>
      ) : (
        <div className="text-center">
          <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-4 border-ouro-500 bg-ouro-100"><span className="flex h-14 w-14 items-center justify-center rounded-full bg-ok text-3xl text-white" aria-hidden="true">✓</span></span>
          <h1 className="mt-4 text-3xl">Pedido confirmado!</h1>
          <p className="mt-2 text-tinta-600">Obrigado! Enviamos os detalhes para o seu e-mail.</p>
          <p className="mt-1 font-semibold">Pedido {p.numero}</p>
        </div>
      )}

      {aguardando && (
        <section className="card mt-8 space-y-5 p-6" aria-label="Pagamento">
          <div className="flex gap-2" role="tablist" aria-label="Forma de pagamento">
            {(['PIX', 'CARTAO'] as const).map((m) => (
              <button key={m} role="tab" aria-selected={metodo === m} onClick={() => setMetodo(m)}
                className={`flex-1 rounded-xl border-2 px-4 py-3 font-bold ${metodo === m ? 'border-roxo-700 bg-roxo-50 text-roxo-700' : 'border-tinta-100 text-tinta-600'}`}>
                {m === 'PIX' ? 'Pix' : 'Cartão de crédito'}
              </button>
            ))}
          </div>
          {metodo === 'PIX' ? <PixPayment numero={p.numero} onAtualizar={() => q.refetch()} /> : <CardPayment numero={p.numero} total={p.total} onAtualizar={() => q.refetch()} />}
          <div className="border-t border-tinta-100 pt-4 text-center"><Button variante="fantasma" onClick={cancelar}>Cancelar pedido</Button></div>
        </section>
      )}

      {p.etapas.length > 0 && (
        <section className="card mt-8 p-6" aria-label="Acompanhamento">
          <h2 className="text-xl">Acompanhamento</h2>
          <ol className="mt-5 grid grid-cols-3 gap-2 text-center">
            {p.etapas.map((e) => (
              <li key={e.codigo} aria-current={e.atual ? 'step' : undefined}>
                <span className={`mx-auto flex h-11 w-11 items-center justify-center rounded-full border-2 font-bold ${e.concluida ? 'border-ok bg-ok text-white' : e.atual ? 'border-ouro-500 bg-ouro-100 text-roxo-900' : 'border-tinta-300 text-tinta-600'}`}>{e.concluida ? '✓' : e.atual ? '•' : ''}</span>
                <span className={`mt-2 block text-sm ${e.atual ? 'font-bold text-roxo-900' : 'text-tinta-600'}`}>{e.rotulo}</span>
              </li>
            ))}
          </ol>
          {p.envio?.codigoRastreio && <p className="mt-5 rounded-xl bg-roxo-50 p-3 text-sm">Rastreamento{p.envio.transportadora ? ` (${p.envio.transportadora})` : ''}: <strong>{p.envio.codigoRastreio}</strong></p>}
          {p.envio?.dataPrevista && <p className="mt-2 text-sm">Entrega prevista: <strong>{dataBR(p.envio.dataPrevista)}</strong></p>}
          {p.tipoEntrega === 'RETIRADA' && <p className="mt-3 text-sm">Retirada na loja, em Guaratinguetá. Avisaremos quando o pedido estiver pronto.</p>}
        </section>
      )}

      <section className="card mt-8 space-y-3 p-6" aria-label="Resumo do pedido">
        <div className="flex items-center justify-between"><h2 className="text-xl">Resumo</h2><Selo cor={p.status === 'CANCELADO' ? 'erro' : aguardando ? 'ouro' : 'ok'}>{p.rotuloStatus}</Selo></div>
        {p.itens.map((i) => <div key={i.produtoId} className="flex justify-between gap-3 text-sm"><span>{i.quantidade}× {i.titulo}</span><span className="font-semibold">{brl(i.quantidade * i.precoUnitario)}</span></div>)}
        <div className="flex justify-between border-t border-tinta-100 pt-3"><span>Subtotal</span><strong>{brl(p.subtotal)}</strong></div>
        <div className="flex justify-between"><span>Frete{p.servicoFrete ? ` (${p.servicoFrete})` : ''}</span><strong>{p.frete === 0 ? 'Grátis' : brl(p.frete)}</strong></div>
        <div className="flex justify-between border-t border-tinta-100 pt-3 text-xl"><span>Total</span><strong className="text-roxo-700">{brl(p.total)}</strong></div>
        {p.endereco && <p className="text-sm text-tinta-600">Entrega em: {p.endereco.logradouro}, {p.endereco.numero}{p.endereco.complemento ? ` – ${p.endereco.complemento}` : ''}, {p.endereco.bairro}, {p.endereco.cidade}/{p.endereco.uf}</p>}
        <p className="text-xs text-tinta-600">Realizado em {dataHoraBR(p.criadoEm)}</p>
      </section>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <LinkButton href="/conta/pedidos" variante="contorno">Meus pedidos</LinkButton>
        <LinkButton href="/">Voltar ao início</LinkButton>
      </div>
      <p className="mt-6 flex items-center justify-center gap-2 text-sm text-ouro-700"><Cruz className="h-4 w-4" /> Que cada página ilumine o seu caminho.</p>
    </div>
  );
}
