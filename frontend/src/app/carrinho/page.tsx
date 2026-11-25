'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BookCover } from '@/components/BookCover';
import { Aviso, Button, Carregando, Input, LinkButton } from '@/components/ui';
import { api, ApiError } from '@/lib/http';
import { useCart } from '@/lib/cart';
import { brl, cepMask } from '@/lib/format';
import type { CarrinhoValidado, OpcaoFrete } from '@/lib/types';

export default function Carrinho() {
  const { itens, definir, remover } = useCart();
  const [cep, setCep] = useState('');
  const [frete, setFrete] = useState<OpcaoFrete[] | null>(null);
  const [erroFrete, setErroFrete] = useState('');
  const [calculando, setCalculando] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['carrinho', itens],
    queryFn: () => api<CarrinhoValidado>('/carrinho/validar', { method: 'POST', body: { itens }, auth: false }),
    enabled: itens.length > 0,
  });

  async function calcularFrete() {
    setErroFrete(''); setFrete(null); setCalculando(true);
    try {
      const r = await api<{ opcoes: OpcaoFrete[] }>('/frete/calcular', { method: 'POST', body: { cep, itens }, auth: false });
      setFrete(r.opcoes);
    } catch (e) {
      setErroFrete(e instanceof ApiError ? e.message : 'Não foi possível calcular o frete.');
    } finally { setCalculando(false); }
  }

  if (!itens.length) {
    return (
      <div className="container-lumen py-20 text-center">
        <h1 className="text-3xl">Seu carrinho está vazio</h1>
        <p className="mt-2 text-tinta-600">Que tal encontrar uma boa leitura?</p>
        <LinkButton href="/catalogo" className="mt-6">Explorar o catálogo</LinkButton>
      </div>
    );
  }

  return (
    <div className="container-lumen py-8">
      <h1 className="text-3xl">Meu carrinho</h1>
      {isLoading && <Carregando />}
      {isError && <Aviso tipo="erro">Não foi possível atualizar o carrinho. Verifique sua conexão.</Aviso>}
      {data && (
        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_360px]">
          <section aria-label="Itens do carrinho" className="space-y-4">
            {data.avisos.map((a, i) => <Aviso key={i} tipo="alerta">{a}</Aviso>)}
            {data.linhas.map((l) => (
              <article key={l.produtoId} className="card flex gap-4 p-4">
                <Link href={`/produto/${l.slug}`} className="block h-28 w-20 shrink-0 overflow-hidden rounded-lg"><BookCover titulo={l.titulo} imagem={l.imagem} /></Link>
                <div className="flex flex-1 flex-col gap-1">
                  <Link href={`/produto/${l.slug}`} className="font-bold hover:text-roxo-500">{l.titulo}</Link>
                  <p className="text-sm text-tinta-600">{l.autor}</p>
                  {!l.disponivel && <p className="text-sm font-semibold text-erro">{l.quantidadeDisponivel === 0 ? 'Produto esgotado' : `Disponível: ${l.quantidadeDisponivel}`}</p>}
                  <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-2">
                    <div className="flex items-center rounded-xl border border-tinta-300">
                      <button className="h-10 w-10 text-xl" aria-label={`Diminuir quantidade de ${l.titulo}`} onClick={() => definir(l.produtoId, l.quantidade - 1)}>−</button>
                      <span className="w-8 text-center font-semibold" aria-live="polite">{l.quantidade}</span>
                      <button className="h-10 w-10 text-xl" aria-label={`Aumentar quantidade de ${l.titulo}`} onClick={() => definir(l.produtoId, l.quantidade + 1)}>+</button>
                    </div>
                    <button className="text-sm font-semibold text-erro underline" onClick={() => remover(l.produtoId)}>Remover</button>
                    <span className="text-lg font-extrabold text-roxo-700">{brl(l.subtotal)}</span>
                  </div>
                </div>
              </article>
            ))}
          </section>

          <aside className="space-y-4" aria-label="Resumo do pedido">
            <div className="card space-y-3 p-5">
              <h2 className="text-xl">Resumo</h2>
              <div className="flex justify-between"><span>Subtotal</span><strong>{brl(data.subtotal)}</strong></div>
              <div className="border-t border-tinta-100 pt-3">
                <label htmlFor="cep" className="text-sm font-semibold">Calcular frete</label>
                <div className="mt-1 flex gap-2">
                  <Input id="cep" inputMode="numeric" placeholder="00000-000" value={cep} onChange={(e) => setCep(cepMask(e.target.value))} />
                  <Button variante="contorno" onClick={calcularFrete} disabled={cep.length < 9 || calculando}>OK</Button>
                </div>
                {erroFrete && <p role="alert" className="mt-2 text-sm text-erro">{erroFrete}</p>}
                {frete && (
                  <ul className="mt-3 space-y-2 text-sm">
                    {frete.map((o) => (
                      <li key={o.codigo} className="flex justify-between gap-2 rounded-lg bg-roxo-50 px-3 py-2">
                        <span>{o.nome}{o.prazoDias > 0 && <span className="text-tinta-600"> · até {o.prazoDias} dias úteis</span>}</span>
                        <strong>{o.preco === 0 ? 'Grátis' : brl(o.preco)}</strong>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <p className="text-xs text-tinta-600">O valor final, com frete, é confirmado no fechamento do pedido.</p>
              {data.podeFinalizar
                ? <LinkButton href="/checkout" className="w-full">Finalizar compra</LinkButton>
                : <Button disabled className="w-full">Ajuste os itens para continuar</Button>}
              <LinkButton href="/catalogo" variante="fantasma" className="w-full">Continuar comprando</LinkButton>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
