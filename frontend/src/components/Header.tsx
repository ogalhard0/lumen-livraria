'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { Categoria } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import { useCart } from '@/lib/cart';
import { Cruz } from './ui';

export function Header({ categorias }: { categorias: Categoria[] }) {
  const router = useRouter();
  const { usuario, sair, equipe } = useAuth();
  const { quantidadeTotal } = useCart();
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState('');

  const buscar = (e: React.FormEvent) => {
    e.preventDefault();
    setAberto(false);
    router.push(busca.trim() ? `/catalogo?q=${encodeURIComponent(busca.trim())}` : '/catalogo');
  };

  return (
    <header className="sticky top-0 z-40 bg-roxo-700 text-white shadow-md">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-ouro-500 focus:px-3 focus:py-2 focus:text-roxo-900">Ir para o conteúdo</a>
      <div className="container-lumen flex items-center gap-3 py-3">
        <button className="rounded-lg p-2 hover:bg-roxo-900 md:hidden" aria-label="Abrir menu" aria-expanded={aberto} onClick={() => setAberto((v) => !v)}>
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
        <Link href="/" className="flex items-center gap-2" aria-label="Lumen Livraria Católica – página inicial">
          <Cruz className="h-7 w-7 text-ouro-500" />
          <span className="text-2xl font-extrabold tracking-tight text-ouro-300">Lumen</span>
        </Link>

        <form onSubmit={buscar} role="search" className="ml-2 hidden flex-1 md:block">
          <label className="sr-only" htmlFor="busca">Buscar livros, bíblias, terços</label>
          <div className="flex overflow-hidden rounded-xl bg-white">
            <input id="busca" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar livros, bíblias, terços…" className="w-full px-4 py-2.5 text-tinta-900 focus:outline-none" />
            <button className="bg-ouro-500 px-5 font-bold text-roxo-900 hover:bg-ouro-300" type="submit">Buscar</button>
          </div>
        </form>

        <nav className="ml-auto flex items-center gap-1 text-sm font-semibold" aria-label="Conta e carrinho">
          {equipe && <Link href="/admin" className="hidden rounded-lg px-3 py-2 text-ouro-300 hover:bg-roxo-900 sm:block">Painel</Link>}
          {usuario ? (
            <>
              <Link href="/conta/pedidos" className="hidden rounded-lg px-3 py-2 hover:bg-roxo-900 sm:block">Olá, {usuario.nome.split(' ')[0]}</Link>
              <button onClick={() => sair().then(() => router.push('/'))} className="rounded-lg px-3 py-2 hover:bg-roxo-900">Sair</button>
            </>
          ) : (
            <Link href="/login" className="rounded-lg px-3 py-2 hover:bg-roxo-900">Entrar</Link>
          )}
          <Link href="/carrinho" className="relative rounded-lg px-3 py-2 hover:bg-roxo-900" aria-label={`Carrinho, ${quantidadeTotal} itens`}>
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0" /></svg>
            {quantidadeTotal > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-ouro-500 px-1 text-xs font-extrabold text-roxo-900">{quantidadeTotal}</span>}
          </Link>
        </nav>
      </div>

      <div className="hidden border-t border-white/10 bg-roxo-900 md:block">
        <nav className="container-lumen flex flex-wrap gap-x-6 py-2 text-sm font-medium" aria-label="Categorias">
          <Link href="/catalogo" className="hover:text-ouro-300">Todos os produtos</Link>
          {categorias.map((c) => <Link key={c.id} href={`/catalogo?categoria=${c.slug}`} className="hover:text-ouro-300">{c.nome}</Link>)}
        </nav>
      </div>

      {aberto && (
        <div className="border-t border-white/10 bg-roxo-900 md:hidden">
          <form onSubmit={buscar} role="search" className="container-lumen py-3">
            <div className="flex overflow-hidden rounded-xl bg-white">
              <input value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar" placeholder="Buscar…" className="w-full px-4 py-2.5 text-tinta-900 focus:outline-none" />
              <button className="bg-ouro-500 px-4 font-bold text-roxo-900" type="submit">OK</button>
            </div>
          </form>
          <nav className="container-lumen flex flex-col pb-3" aria-label="Categorias">
            <Link onClick={() => setAberto(false)} href="/catalogo" className="py-2.5">Todos os produtos</Link>
            {categorias.map((c) => <Link onClick={() => setAberto(false)} key={c.id} href={`/catalogo?categoria=${c.slug}`} className="py-2.5">{c.nome}</Link>)}
            {equipe && <Link onClick={() => setAberto(false)} href="/admin" className="py-2.5 text-ouro-300">Painel da loja</Link>}
          </nav>
        </div>
      )}
    </header>
  );
}
