'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Carregando, Selo } from '@/components/ui';
import { api } from '@/lib/http';
import { brl, COR_STATUS, dataHoraBR, ROTULO_STATUS, SITUACAO_ESTOQUE } from '@/lib/format';

interface Resumo {
  pedidosHoje: number; vendasHoje: number; itensEmEstoque: number; produtosEstoqueBaixo: number; produtosSemEstoque: number;
  pedidosPorStatus: Record<string, number>;
  pedidosRecentes: { numero: string; cliente: string; total: number; status: string; criadoEm: string }[];
  estoqueCritico: { id: number; titulo: string; estoqueAtual: number; estoqueMinimo: number; situacao: string }[];
}

export default function Painel() {
  const { data, isLoading } = useQuery({ queryKey: ['admin-resumo'], queryFn: () => api<Resumo>('/admin/resumo'), refetchInterval: 30_000 });
  if (isLoading || !data) return <Carregando />;
  const cartoes = [
    ['Pedidos hoje', String(data.pedidosHoje)], ['Vendas hoje', brl(data.vendasHoje)], ['Itens em estoque', String(data.itensEmEstoque)],
    ['Estoque baixo', String(data.produtosEstoqueBaixo)], ['Sem estoque', String(data.produtosSemEstoque)],
  ];
  return (
    <div className="space-y-8">
      <h1 className="text-3xl">Resumo de hoje</h1>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {cartoes.map(([t, v]) => <div key={t} className="card p-4"><p className="text-sm text-tinta-600">{t}</p><p className="mt-1 text-2xl font-extrabold text-roxo-700">{v}</p></div>)}
      </div>
      <div>
        <h2 className="text-xl">Pedidos por status</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {Object.entries(data.pedidosPorStatus).map(([s, n]) => <Link key={s} href={`/admin/pedidos?status=${s}`}><Selo cor={COR_STATUS[s]}>{ROTULO_STATUS[s]}: {n}</Selo></Link>)}
          {Object.keys(data.pedidosPorStatus).length === 0 && <p className="text-sm text-tinta-600">Ainda não há pedidos.</p>}
        </div>
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="card p-5" aria-labelledby="h-rec">
          <div className="flex items-center justify-between"><h2 id="h-rec" className="text-xl">Pedidos recentes</h2><Link href="/admin/pedidos" className="link text-sm">Ver todos</Link></div>
          <ul className="mt-3 divide-y divide-tinta-100">
            {data.pedidosRecentes.map((p) => (
              <li key={p.numero} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <span><strong>{p.numero}</strong> · {p.cliente}<span className="block text-xs text-tinta-600">{dataHoraBR(p.criadoEm)}</span></span>
                <Selo cor={COR_STATUS[p.status]}>{ROTULO_STATUS[p.status]}</Selo><strong>{brl(p.total)}</strong>
              </li>
            ))}
          </ul>
        </section>
        <section className="card p-5" aria-labelledby="h-crit">
          <div className="flex items-center justify-between"><h2 id="h-crit" className="text-xl">Estoque crítico</h2><Link href="/admin/estoque" className="link text-sm">Registrar entrada</Link></div>
          <ul className="mt-3 divide-y divide-tinta-100">
            {data.estoqueCritico.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 py-3 text-sm">
                <span>{p.titulo}<span className="block text-xs text-tinta-600">{p.estoqueAtual} un. (mínimo {p.estoqueMinimo})</span></span>
                <Selo cor={SITUACAO_ESTOQUE[p.situacao].cor}>{SITUACAO_ESTOQUE[p.situacao].rotulo}</Selo>
              </li>
            ))}
            {data.estoqueCritico.length === 0 && <li className="py-3 text-sm text-tinta-600">Nenhum produto com estoque crítico.</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}
