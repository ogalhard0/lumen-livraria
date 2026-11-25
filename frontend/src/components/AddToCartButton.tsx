'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/lib/cart';
import { Button } from './ui';

export function AddToCartButton({ produtoId, disponivel, compacto = false }: { produtoId: number; disponivel: boolean; compacto?: boolean }) {
  const { adicionar } = useCart();
  const router = useRouter();
  const [qtd, setQtd] = useState(1);
  const [ok, setOk] = useState(false);

  if (!disponivel) return <Button disabled variante="contorno" className="w-full">Esgotado</Button>;

  if (compacto) {
    return (
      <button
        type="button"
        aria-label="Adicionar ao carrinho"
        onClick={() => { adicionar(produtoId); setOk(true); setTimeout(() => setOk(false), 1500); }}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-ouro-500 text-xl font-bold text-roxo-900 hover:bg-ouro-300"
      >
        {ok ? '✓' : '+'}
      </button>
    );
  }
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold">Quantidade</span>
        <div className="flex items-center rounded-xl border border-tinta-300 bg-white">
          <button type="button" aria-label="Diminuir" className="h-11 w-11 text-xl" onClick={() => setQtd((q) => Math.max(1, q - 1))}>−</button>
          <span aria-live="polite" className="w-10 text-center font-semibold">{qtd}</span>
          <button type="button" aria-label="Aumentar" className="h-11 w-11 text-xl" onClick={() => setQtd((q) => Math.min(20, q + 1))}>+</button>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Button variante="ouro" onClick={() => { adicionar(produtoId, qtd); setOk(true); setTimeout(() => setOk(false), 2000); }}>
          {ok ? '✓ Adicionado!' : 'Adicionar ao carrinho'}
        </Button>
        <Button variante="primario" onClick={() => { adicionar(produtoId, qtd); router.push('/carrinho'); }}>Comprar agora</Button>
      </div>
    </div>
  );
}
