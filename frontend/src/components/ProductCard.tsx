import Link from 'next/link';
import type { ProdutoCard } from '@/lib/types';
import { brl } from '@/lib/format';
import { BookCover } from './BookCover';
import { AddToCartButton } from './AddToCartButton';
import { Selo } from './ui';

export function ProductCard({ p }: { p: ProdutoCard }) {
  return (
    <article className="card flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg">
      <Link href={`/produto/${p.slug}`} className="block aspect-[4/5] overflow-hidden bg-roxo-50" aria-label={p.titulo}>
        <BookCover titulo={p.titulo} imagem={p.imagem} />
      </Link>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <div className="min-h-[1.5rem]">
          {p.disponibilidade === 'ESGOTADO' && <Selo cor="cinza">Esgotado</Selo>}
          {p.disponibilidade === 'ULTIMAS_UNIDADES' && <Selo cor="ouro">Últimas unidades</Selo>}
        </div>
        <h3 className="line-clamp-2 text-base font-bold leading-snug text-tinta-900">
          <Link href={`/produto/${p.slug}`} className="hover:text-roxo-500">{p.titulo}</Link>
        </h3>
        <p className="line-clamp-1 text-sm text-tinta-600">{p.autor}</p>
        <div className="mt-auto flex items-center justify-between pt-3">
          <span className="text-lg font-extrabold text-roxo-700">{brl(p.preco)}</span>
          <AddToCartButton produtoId={p.id} disponivel={p.disponibilidade !== 'ESGOTADO'} compacto />
        </div>
      </div>
    </article>
  );
}
