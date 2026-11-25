import type { Metadata } from 'next';
import Link from 'next/link';
import { AddToCartButton } from '@/components/AddToCartButton';
import { BookCover } from '@/components/BookCover';
import { ProductCard } from '@/components/ProductCard';
import { Selo } from '@/components/ui';
import { brl, SITE_URL } from '@/lib/format';
import { getJSON } from '@/lib/server-api';
import type { ProdutoDetalhe } from '@/lib/types';

type Props = { params: { slug: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const p = await getJSON<ProdutoDetalhe>(`/produtos/${encodeURIComponent(params.slug)}`);
    return { title: p.titulo, description: p.descricao.slice(0, 160), openGraph: { title: p.titulo, description: p.descricao.slice(0, 160), type: 'website' } };
  } catch {
    return { title: 'Produto' };
  }
}

export default async function Produto({ params }: Props) {
  const p = await getJSON<ProdutoDetalhe>(`/produtos/${encodeURIComponent(params.slug)}`, 30);
  const disponivel = p.disponibilidade !== 'ESGOTADO';
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'Product', name: p.titulo, description: p.descricao, brand: p.autor,
    offers: { '@type': 'Offer', priceCurrency: 'BRL', price: p.preco.toFixed(2), availability: disponivel ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock', url: `${SITE_URL}/produto/${p.slug}` },
  };

  return (
    <div className="container-lumen py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <nav aria-label="Você está em" className="text-sm text-tinta-600">
        <Link href="/" className="link">Início</Link> › <Link href="/catalogo" className="link">Catálogo</Link> › <Link href={`/catalogo?categoria=${p.categoria.slug}`} className="link">{p.categoria.nome}</Link>
      </nav>

      <div className="mt-6 grid gap-10 md:grid-cols-[380px_1fr]">
        <div className="mx-auto aspect-[4/5] w-full max-w-sm overflow-hidden rounded-2xl shadow-card"><BookCover titulo={p.titulo} imagem={p.imagem} /></div>
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            {p.disponibilidade === 'EM_ESTOQUE' && <Selo cor="ok">Em estoque</Selo>}
            {p.disponibilidade === 'ULTIMAS_UNIDADES' && <Selo cor="ouro">Últimas unidades</Selo>}
            {p.disponibilidade === 'ESGOTADO' && <Selo cor="cinza">Esgotado</Selo>}
            <Selo cor="roxo">{p.categoria.nome}</Selo>
          </div>
          <h1 className="text-3xl md:text-4xl">{p.titulo}</h1>
          <p className="text-lg text-tinta-600">por <span className="font-semibold text-tinta-900">{p.autor}</span></p>
          <p className="text-4xl font-extrabold text-roxo-700">{brl(p.preco)}</p>
          <p className="text-sm text-tinta-600">ou 3x de {brl(p.preco / 3)} sem juros no cartão (condições sujeitas ao provedor de pagamento).</p>
          <AddToCartButton produtoId={p.id} disponivel={disponivel} />
          <ul className="card space-y-3 p-4 text-sm">
            <li className="flex gap-3"><span aria-hidden="true">🚚</span><span>Entrega para todo o Brasil. Calcule o frete no carrinho.</span></li>
            <li className="flex gap-3"><span aria-hidden="true">⛪</span><span>Retirada gratuita na loja, em Guaratinguetá.</span></li>
            <li className="flex gap-3"><span aria-hidden="true">↩️</span><span>7 dias para desistir da compra, conforme o Código de Defesa do Consumidor.</span></li>
          </ul>
          <section aria-labelledby="h-desc">
            <h2 id="h-desc" className="text-xl">Sobre o produto</h2>
            <p className="mt-2 whitespace-pre-line leading-relaxed text-tinta-900">{p.descricao}</p>
          </section>
        </div>
      </div>

      {p.relacionados.length > 0 && (
        <section className="mt-14" aria-labelledby="h-rel">
          <h2 id="h-rel" className="text-2xl">Você também pode gostar</h2>
          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">{p.relacionados.map((r) => <ProductCard key={r.id} p={r} />)}</div>
        </section>
      )}
    </div>
  );
}
