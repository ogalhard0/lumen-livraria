'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Aviso, Button, Carregando, Input } from '@/components/ui';
import { api } from '@/lib/http';
import { dataBR } from '@/lib/format';
import type { Pagina } from '@/lib/types';

interface C { id: number; nome: string; email: string; telefone: string | null; criadoEm: string; totalPedidos: number }

export default function Clientes() {
  const [q, setQ] = useState('');
  const [pagina, setPagina] = useState(1);
  const lista = useQuery({ queryKey: ['admin-clientes', q, pagina], queryFn: () => api<Pagina<C>>(`/admin/clientes?pagina=${pagina}${q ? `&q=${encodeURIComponent(q)}` : ''}`) });
  return (
    <div className="space-y-5">
      <h1 className="text-3xl">Clientes</h1>
      <Aviso tipo="alerta">Dados pessoais protegidos pela LGPD. Use apenas para atendimento. Cada consulta é registrada na trilha de auditoria.</Aviso>
      <Input placeholder="Buscar por nome ou e-mail" value={q} onChange={(e) => { setQ(e.target.value); setPagina(1); }} aria-label="Buscar clientes" className="max-w-md" />
      {lista.isLoading && <Carregando />}
      {lista.data && (
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-roxo-50 text-xs uppercase text-roxo-700"><tr><th className="p-3">Nome</th><th className="p-3">E-mail</th><th className="p-3">Telefone</th><th className="p-3">Cadastro</th><th className="p-3 text-right">Pedidos</th></tr></thead>
            <tbody className="divide-y divide-tinta-100">
              {lista.data.itens.map((c) => <tr key={c.id}><td className="p-3 font-semibold">{c.nome}</td><td className="p-3">{c.email}</td><td className="p-3">{c.telefone ?? '—'}</td><td className="p-3">{dataBR(c.criadoEm)}</td><td className="p-3 text-right">{c.totalPedidos}</td></tr>)}
              {lista.data.itens.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-tinta-600">Nenhum cliente encontrado.</td></tr>}
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
