'use client';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Aviso, Button, Carregando, Input, Selo } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { api, ApiError } from '@/lib/http';
import { SITUACAO_ESTOQUE } from '@/lib/format';
import type { Pagina } from '@/lib/types';

interface P { id: number; titulo: string; estoqueAtual: number; estoqueMinimo: number; situacaoEstoque: string; ativo: boolean }

function Linha({ p, admin, aoMudar }: { p: P; admin: boolean; aoMudar: () => void }) {
  const [qtd, setQtd] = useState('');
  const [erro, setErro] = useState('');
  const entrada = useMutation({
    mutationFn: () => api('/admin/estoque/entradas', { method: 'POST', body: { produtoId: p.id, quantidade: Number(qtd), observacao: 'Entrada manual' } }),
    onSuccess: () => { setQtd(''); setErro(''); aoMudar(); },
    onError: (e) => setErro(e instanceof ApiError ? e.message : 'Erro'),
  });
  const ajuste = useMutation({
    mutationFn: (v: { novoEstoque: number; motivo: string }) => api('/admin/estoque/ajustes', { method: 'POST', body: { produtoId: p.id, ...v } }),
    onSuccess: aoMudar,
    onError: (e) => setErro(e instanceof ApiError ? e.message : 'Erro'),
  });
  return (
    <tr className={p.ativo ? '' : 'opacity-50'}>
      <td className="p-3 font-semibold">{p.titulo}{erro && <span role="alert" className="block text-xs font-normal text-erro">{erro}</span>}</td>
      <td className="p-3 text-center text-lg font-bold">{p.estoqueAtual}</td><td className="p-3 text-center">{p.estoqueMinimo}</td>
      <td className="p-3"><Selo cor={SITUACAO_ESTOQUE[p.situacaoEstoque].cor}>{SITUACAO_ESTOQUE[p.situacaoEstoque].rotulo}</Selo></td>
      <td className="p-3">
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (Number(qtd) > 0) entrada.mutate(); }}>
          <Input type="number" min="1" value={qtd} onChange={(e) => setQtd(e.target.value)} placeholder="Qtd." aria-label={`Quantidade de entrada de ${p.titulo}`} className="!w-24 !py-2" />
          <Button type="submit" variante="ouro" className="!px-3 !py-2 text-sm" disabled={!qtd || entrada.isPending}>+ Entrada</Button>
        </form>
      </td>
      <td className="p-3 text-right">
        {admin && <Button variante="fantasma" className="!px-2 !py-1 text-sm" onClick={() => {
          const v = window.prompt(`Novo saldo de "${p.titulo}" (atual: ${p.estoqueAtual}):`);
          if (v === null || v.trim() === '' || !/^\d+$/.test(v.trim())) return;
          const motivo = window.prompt('Motivo do ajuste (obrigatório):');
          if (motivo && motivo.trim().length >= 3) ajuste.mutate({ novoEstoque: Number(v), motivo: motivo.trim() });
        }}>Ajustar</Button>}
      </td>
    </tr>
  );
}

export default function Estoque() {
  const qc = useQueryClient();
  const { usuario } = useAuth();
  const [filtro, setFiltro] = useState<'' | 'baixo' | 'sem'>('');
  const [q, setQ] = useState('');
  const lista = useQuery({ queryKey: ['admin-estoque', filtro, q], queryFn: () => api<Pagina<P>>(`/admin/produtos?porPagina=50${filtro ? `&estoque=${filtro}` : ''}&ativo=true${q ? `&q=${encodeURIComponent(q)}` : ''}`) });
  const atualizar = () => { qc.invalidateQueries({ queryKey: ['admin-estoque'] }); qc.invalidateQueries({ queryKey: ['admin-resumo'] }); };

  return (
    <div className="space-y-5">
      <h1 className="text-3xl">Estoque</h1>
      <Aviso>Cada venda reserva o estoque automaticamente; pedidos cancelados ou expirados devolvem as unidades. Use “Entrada” ao receber mercadoria.</Aviso>
      <div className="flex flex-wrap items-center gap-2">
        {([['', 'Todos'], ['baixo', 'Estoque baixo'], ['sem', 'Sem estoque']] as const).map(([v, t]) => (
          <button key={v} onClick={() => setFiltro(v)} aria-pressed={filtro === v} className={`rounded-full px-4 py-1.5 text-sm font-semibold ${filtro === v ? 'bg-roxo-700 text-white' : 'bg-roxo-100 text-roxo-700'}`}>{t}</button>
        ))}
        <Input placeholder="Buscar produto" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar produto" className="ml-auto max-w-xs !py-2" />
      </div>
      {lista.isLoading && <Carregando />}
      {lista.data && (
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-roxo-50 text-xs uppercase text-roxo-700"><tr><th className="p-3">Produto</th><th className="p-3 text-center">Atual</th><th className="p-3 text-center">Mínimo</th><th className="p-3">Situação</th><th className="p-3">Registrar entrada</th><th className="p-3" /></tr></thead>
            <tbody className="divide-y divide-tinta-100">{lista.data.itens.map((p) => <Linha key={p.id} p={p} admin={usuario?.perfil === 'ADMINISTRADOR'} aoMudar={atualizar} />)}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
