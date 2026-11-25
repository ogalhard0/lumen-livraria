'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Carregando, classeBotao, Input, Selo } from '@/components/ui';
import { api } from '@/lib/http';
import { brl, SITUACAO_ESTOQUE } from '@/lib/format';
import type { Pagina } from '@/lib/types';

interface P { id: number; titulo: string; autor: string; preco: number; ativo: boolean; categoria: { nome: string }; estoqueAtual: number; situacaoEstoque: string }

export default function AdminProdutos() {
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [pagina, setPagina] = useState(1);
  const lista = useQuery({ queryKey: ['admin-produtos', q, pagina], queryFn: () => api<Pagina<P>>(`/admin/produtos?pagina=${pagina}${q ? `&q=${encodeURIComponent(q)}` : ''}`) });
  const inativar = useMutation({ mutationFn: (id: number) => api(`/admin/produtos/${id}`, { method: 'DELETE' }), onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-produtos'] }) });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-3xl">Produtos</h1><Link href="/admin/produtos/novo" className={classeBotao('ouro')}>+ Novo produto</Link></div>
      <Input placeholder="Buscar por título ou autor" value={q} onChange={(e) => { setQ(e.target.value); setPagina(1); }} aria-label="Buscar produtos" className="max-w-md" />
      {lista.isLoading && <Carregando />}
      {lista.data && (
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-roxo-50 text-xs uppercase text-roxo-700"><tr><th className="p-3">Produto</th><th className="p-3">Categoria</th><th className="p-3 text-right">Preço</th><th className="p-3">Estoque</th><th className="p-3">Situação</th><th className="p-3" /></tr></thead>
            <tbody className="divide-y divide-tinta-100">
              {lista.data.itens.map((p) => (
                <tr key={p.id} className={p.ativo ? '' : 'opacity-50'}>
                  <td className="p-3 font-semibold">{p.titulo}<span className="block text-xs font-normal text-tinta-600">{p.autor}</span></td>
                  <td className="p-3">{p.categoria.nome}</td><td className="p-3 text-right">{brl(p.preco)}</td>
                  <td className="p-3">{p.estoqueAtual}</td>
                  <td className="p-3">{p.ativo ? <Selo cor={SITUACAO_ESTOQUE[p.situacaoEstoque].cor}>{SITUACAO_ESTOQUE[p.situacaoEstoque].rotulo}</Selo> : <Selo cor="cinza">Inativo</Selo>}</td>
                  <td className="space-x-2 p-3 text-right">
                    <Link href={`/admin/produtos/${p.id}`} className="link font-semibold">Editar</Link>
                    {p.ativo && <Button variante="fantasma" className="!px-2 !py-1 text-sm !text-erro" onClick={() => confirm(`Inativar "${p.titulo}"? Ele deixará de aparecer na loja.`) && inativar.mutate(p.id)}>Inativar</Button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {lista.data && lista.data.totalPaginas > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button variante="contorno" disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)} className="!py-2">‹</Button>
          <span className="text-sm">Página {pagina} de {lista.data.totalPaginas}</span>
          <Button variante="contorno" disabled={pagina >= lista.data.totalPaginas} onClick={() => setPagina((p) => p + 1)} className="!py-2">›</Button>
        </div>
      )}
    </div>
  );
}
