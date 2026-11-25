import Link from 'next/link';
import { Carousel } from '@/components/Carousel';
import { ProductCard } from '@/components/ProductCard';
import { Cruz, classeBotao } from '@/components/ui';
import { getJSONOu } from '@/lib/server-api';
import type { Banner, Categoria, Pagina, ProdutoCard } from '@/lib/types';

const FALLBACK: Banner[] = [{ id: 0, titulo: 'Fé que ilumina. Palavras que transformam.', subtitulo: 'Livros, bíblias e artigos católicos com entrega para todo o Brasil.', imagem: null, link: '/catalogo' }];
const VAZIO: Pagina<ProdutoCard> = { itens: [], total: 0, pagina: 1, porPagina: 8, totalPaginas: 1 };

export default async function Home() {
  const [banners, categorias, destaques, novos] = await Promise.all([
    getJSONOu<Banner[]>('/banners', FALLBACK, 120),
    getJSONOu<Categoria[]>('/categorias', [], 300),
    getJSONOu<Pagina<ProdutoCard>>('/produtos?destaque=true&porPagina=8', VAZIO, 120),
    getJSONOu<Pagina<ProdutoCard>>('/produtos?ordem=recentes&porPagina=4', VAZIO, 120),
  ]);

  return (
    <>
      <Carousel banners={banners.length ? banners : FALLBACK} />

      <section className="container-lumen -mt-8 relative z-10 grid gap-4 sm:grid-cols-3" aria-label="Vantagens">
        {[
          ['🚚', 'Entrega para todo o Brasil', 'Calcule o frete pelo CEP'],
          ['⛪', 'Retire na loja', 'Sem custo de frete'],
          ['🔒', 'Pagamento seguro', 'Pix e cartão de crédito'],
        ].map(([ic, t, d]) => (
          <div key={t} className="card flex items-center gap-4 p-5">
            <span className="text-3xl" aria-hidden="true">{ic}</span>
            <div><p className="font-bold text-roxo-900">{t}</p><p className="text-sm text-tinta-600">{d}</p></div>
          </div>
        ))}
      </section>

      {categorias.length > 0 && (
        <section className="container-lumen mt-14" aria-labelledby="h-cat">
          <h2 id="h-cat" className="text-2xl md:text-3xl">Explore por categoria</h2>
          <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {categorias.map((c) => (
              <li key={c.id}>
                <Link href={`/catalogo?categoria=${c.slug}`} className="card group flex h-full flex-col items-start gap-3 p-5 transition hover:border-ouro-500 hover:shadow-lg">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-roxo-100 text-roxo-700 group-hover:bg-ouro-100"><Cruz className="h-5 w-5" /></span>
                  <span className="font-bold text-roxo-900">{c.nome}</span>
                  {c.filhas.length > 0 && <span className="text-xs text-tinta-600">{c.filhas.map((f) => f.nome).join(' · ')}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="container-lumen mt-14" aria-labelledby="h-dest">
        <div className="flex items-end justify-between gap-4">
          <h2 id="h-dest" className="text-2xl md:text-3xl">Mais procurados</h2>
          <Link href="/catalogo" className="link text-sm font-semibold">Ver todos</Link>
        </div>
        {destaques.itens.length ? (
          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">{destaques.itens.map((p) => <ProductCard key={p.id} p={p} />)}</div>
        ) : (
          <p className="mt-6 text-tinta-600">Em breve novos destaques.</p>
        )}
      </section>

      <section className="container-lumen mt-14 overflow-hidden rounded-3xl bg-ouro-100 p-8 md:flex md:items-center md:justify-between" aria-labelledby="h-nov">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-ouro-700">Novidades</p>
          <h2 id="h-nov" className="mt-1 text-2xl">Chegaram agora na Lumen</h2>
          <p className="mt-1 text-tinta-600">Confira os últimos títulos adicionados ao catálogo.</p>
        </div>
        <Link href="/catalogo?ordem=recentes" className={classeBotao('primario', 'mt-4 md:mt-0')}>Ver lançamentos</Link>
      </section>
      {novos.itens.length > 0 && (
        <div className="container-lumen mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">{novos.itens.map((p) => <ProductCard key={p.id} p={p} />)}</div>
      )}
    </>
  );
}
