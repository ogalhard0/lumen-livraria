import type { Metadata } from 'next';
import { getJSON } from '@/lib/server-api';

type Props = { params: { slug: string } };
interface Pg { slug: string; titulo: string; conteudo: string }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try { return { title: (await getJSON<Pg>(`/paginas/${encodeURIComponent(params.slug)}`)).titulo }; } catch { return { title: 'Página' }; }
}

export default async function Pagina({ params }: Props) {
  const p = await getJSON<Pg>(`/paginas/${encodeURIComponent(params.slug)}`, 300);
  return (
    <article className="container-lumen max-w-3xl py-10">
      <h1 className="text-3xl">{p.titulo}</h1>
      <div className="mt-6 space-y-4 leading-relaxed">{p.conteudo.split('\n').map((l, i) => <p key={i}>{l}</p>)}</div>
    </article>
  );
}
