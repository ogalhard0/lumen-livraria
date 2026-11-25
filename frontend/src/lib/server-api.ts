import { notFound } from 'next/navigation';

const BASE = process.env.INTERNAL_API_URL ?? 'http://localhost:3001';

/** Busca de dados públicos no servidor (SSR), com cache curto. */
export async function getJSON<T>(caminho: string, revalidate = 60): Promise<T> {
  const r = await fetch(`${BASE}/api/v1${caminho}`, { next: { revalidate } });
  if (r.status === 404) notFound();
  if (!r.ok) throw new Error(`API respondeu ${r.status} em ${caminho}`);
  return (await r.json()) as T;
}

/** Variante tolerante: devolve o valor padrão se a API estiver indisponível. */
export async function getJSONOu<T>(caminho: string, padrao: T, revalidate = 60): Promise<T> {
  try {
    const r = await fetch(`${BASE}/api/v1${caminho}`, { next: { revalidate } });
    return r.ok ? ((await r.json()) as T) : padrao;
  } catch {
    return padrao;
  }
}
