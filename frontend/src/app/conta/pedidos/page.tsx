'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Aviso, Button, Carregando, LinkButton, Selo } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { api, ApiError } from '@/lib/http';
import { brl, dataBR } from '@/lib/format';
import type { Pedido } from '@/lib/types';

export default function MeusPedidos() {
  const router = useRouter();
  const { usuario, carregando, sair } = useAuth();
  const [msg, setMsg] = useState('');
  useEffect(() => { if (!carregando && !usuario) router.replace('/login?next=/conta/pedidos'); }, [carregando, usuario, router]);
  const q = useQuery({ queryKey: ['meus-pedidos'], queryFn: () => api<Pedido[]>('/pedidos'), enabled: !!usuario });

  async function baixarDados() {
    const dados = await api('/auth/meus-dados');
    const url = URL.createObjectURL(new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = 'meus-dados-lumen.json'; a.click(); URL.revokeObjectURL(url);
  }
  async function excluir() {
    if (!confirm('Excluir sua conta? Seus dados pessoais serão removidos. Esta ação não pode ser desfeita.')) return;
    try { await api('/auth/minha-conta', { method: 'DELETE' }); await sair(); router.push('/'); }
    catch (e) { setMsg(e instanceof ApiError ? e.message : 'Não foi possível excluir a conta.'); }
  }

  if (carregando || !usuario) return <Carregando />;
  return (
    <div className="container-lumen max-w-3xl py-10">
      <h1 className="text-3xl">Meus pedidos</h1>
      <p className="mt-1 text-tinta-600">{usuario.nome} · {usuario.email}</p>
      {q.isLoading && <Carregando />}
      {q.data && q.data.length === 0 && <div className="card mt-6 p-8 text-center"><p>Você ainda não fez pedidos.</p><LinkButton href="/catalogo" className="mt-4">Explorar o catálogo</LinkButton></div>}
      <ul className="mt-6 space-y-3">
        {q.data?.map((p) => (
          <li key={p.numero}>
            <Link href={`/pedido/${p.numero}`} className="card flex flex-wrap items-center justify-between gap-3 p-4 hover:border-ouro-500">
              <div><p className="font-bold">{p.numero}</p><p className="text-sm text-tinta-600">{dataBR(p.criadoEm)} · {p.itens.reduce((s, i) => s + i.quantidade, 0)} item(ns)</p></div>
              <Selo cor={p.status === 'CANCELADO' ? 'erro' : p.status === 'AGUARDANDO_PAGAMENTO' ? 'ouro' : 'ok'}>{p.rotuloStatus}</Selo>
              <strong className="text-roxo-700">{brl(p.total)}</strong>
            </Link>
          </li>
        ))}
      </ul>

      <section className="card mt-12 space-y-3 p-6" aria-labelledby="h-priv">
        <h2 id="h-priv" className="text-xl">Privacidade e dados (LGPD)</h2>
        <p className="text-sm text-tinta-600">Você pode baixar uma cópia dos seus dados ou excluir a sua conta a qualquer momento.</p>
        {msg && <Aviso tipo="erro">{msg}</Aviso>}
        <div className="flex flex-wrap gap-3"><Button variante="contorno" onClick={baixarDados}>Baixar meus dados</Button><Button variante="perigo" onClick={excluir}>Excluir minha conta</Button></div>
      </section>
    </div>
  );
}
