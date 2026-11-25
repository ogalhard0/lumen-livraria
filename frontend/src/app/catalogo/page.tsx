import type { Metadata } from 'next';
import Link from 'next/link';
import { ProductCard } from '@/components/ProductCard';
import { Button, Input, Paginacao, Select, classeBotao } from '@/components/ui';
import { getJSON, getJSONOu } from '@/lib/server-api';
import type { Categoria, Pagina, ProdutoCard } from '@/lib/types';

export const metadata: Metadata = { title: 'Catálogo', description: 'Todos os livros, bíblias, terços e artigos católicos da Lumen.' };
type SP = Record<string, string | string[] | undefined>;
const um = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

export default async function Catalogo({ searchParams }: { searchParams: SP }) {
  const f = {
    q: um(searchParams.q), categoria: um(searchParams.categoria), precoMin: um(searchParams.precoMin), precoMax: um(searchParams.precoMax),
    formato: um(searchParams.formato), idioma: um(searchParams.idioma), disponibilidade: um(searchParams.disponibilidade),
    ordem: um(searchParams.ordem) || 'recentes', pagina: um(searchParams.pagina) || '1',
  };
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) if (v) qs.set(k, v);
  qs.set('porPagina', '12');

  const [categorias, dados] = await Promise.all([
    getJSONOu<Categoria[]>('/categorias', [], 300),
    getJSON<Pagina<ProdutoCard>>(`/produtos?${qs.toString()}`, 30).catch(() => ({ itens: [], total: 0, pagina: 1, porPagina: 12, totalPaginas: 1 }) as Pagina<ProdutoCard>),
  ]);

  const href = (p: number) => {
    const n = new URLSearchParams(qs); n.delete('porPagina'); n.set('pagina', String(p));
    return `/catalogo?${n.toString()}`;
  };
  const ativa = categorias.flatMap((c) => [c, ...c.filhas.map((x) => ({ ...x, filhas: [] as Categoria['filhas'] }))]).find((c) => c.slug === f.categoria);

  return (
    <div className="container-lumen py-8">
      <nav aria-label="Você está em" className="text-sm text-tinta-600"><Link href="/" className="link">Início</Link> › Catálogo{ativa && <> › {ativa.nome}</>}</nav>
      <h1 className="mt-2 text-3xl">{ativa ? ativa.nome : f.q ? `Resultados para “${f.q}”` : 'Catálogo'}</h1>

      <div className="mt-6 grid gap-8 lg:grid-cols-[260px_1fr]">
        <form method="get" action="/catalogo" className="card h-fit space-y-4 p-5" aria-label="Filtros">
          <h2 className="text-lg">Filtrar</h2>
          <label className="block text-sm font-semibold">Buscar<Input name="q" defaultValue={f.q} placeholder="Título ou autor" className="mt-1" /></label>
          <label className="block text-sm font-semibold">Categoria
            <Select name="categoria" defaultValue={f.categoria} className="mt-1">
              <option value="">Todas</option>
              {categorias.map((c) => (
                <optgroup key={c.id} label={c.nome}>
                  <option value={c.slug}>Todas em {c.nome}</option>
                  {c.filhas.map((x) => <option key={x.id} value={x.slug}>{x.nome}</option>)}
                </optgroup>
              ))}
            </Select>
          </label>
          <fieldset className="grid grid-cols-2 gap-2">
            <legend className="mb-1 text-sm font-semibold">Preço (R$)</legend>
            <Input name="precoMin" type="number" min="0" step="1" defaultValue={f.precoMin} placeholder="Mín." aria-label="Preço mínimo" />
            <Input name="precoMax" type="number" min="0" step="1" defaultValue={f.precoMax} placeholder="Máx." aria-label="Preço máximo" />
          </fieldset>
          <label className="block text-sm font-semibold">Formato
            <Select name="formato" defaultValue={f.formato} className="mt-1"><option value="">Todos</option><option value="FISICO">Físico</option></Select>
          </label>
          <label className="block text-sm font-semibold">Idioma
            <Select name="idioma" defaultValue={f.idioma} className="mt-1"><option value="">Todos</option><option value="pt-BR">Português</option><option value="es">Espanhol</option></Select>
          </label>
          <label className="block text-sm font-semibold">Disponibilidade
            <Select name="disponibilidade" defaultValue={f.disponibilidade} className="mt-1"><option value="">Todas</option><option value="em_estoque">Em estoque</option></Select>
          </label>
          <label className="block text-sm font-semibold">Ordenar por
            <Select name="ordem" defaultValue={f.ordem} className="mt-1">
              <option value="recentes">Mais recentes</option><option value="preco_asc">Menor preço</option><option value="preco_desc">Maior preço</option><option value="titulo">Título (A–Z)</option>
            </Select>
          </label>
          <div className="flex gap-2"><Button type="submit" className="flex-1">Aplicar</Button><Link href="/catalogo" className={classeBotao('contorno')}>Limpar</Link></div>
        </form>

        <section aria-live="polite">
          <p className="mb-4 text-sm text-tinta-600">{dados.total} {dados.total === 1 ? 'produto encontrado' : 'produtos encontrados'}</p>
          {dados.itens.length ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">{dados.itens.map((p) => <ProductCard key={p.id} p={p} />)}</div>
          ) : (
            <div className="card p-10 text-center"><p className="text-lg font-semibold">Nenhum produto encontrado.</p><p className="mt-1 text-tinta-600">Tente remover alguns filtros ou buscar por outro termo.</p></div>
          )}
          <Paginacao pagina={dados.pagina} totalPaginas={dados.totalPaginas} href={href} />
        </section>
      </div>
    </div>
  );
}
