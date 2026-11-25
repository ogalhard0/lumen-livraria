import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/format';
import { getJSONOu } from '@/lib/server-api';
import type { Pagina, ProdutoCard } from '@/lib/types';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const fixas = ['', '/catalogo', '/paginas/quem-somos', '/paginas/politica-de-privacidade', '/paginas/trocas-e-devolucoes'].map((p) => ({ url: `${SITE_URL}${p}` }));
  const prod = await getJSONOu<Pagina<ProdutoCard>>('/produtos?porPagina=48', { itens: [], total: 0, pagina: 1, porPagina: 48, totalPaginas: 1 }, 3600);
  return [...fixas, ...prod.itens.map((p) => ({ url: `${SITE_URL}/produto/${p.slug}` }))];
}
