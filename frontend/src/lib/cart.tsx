'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { api } from './http';
import { useAuth } from './auth';

export interface ItemLocal { produtoId: number; quantidade: number }
const CHAVE = 'lumen.carrinho.v1';
const MAX = 20;

interface CartCtx {
  itens: ItemLocal[];
  quantidadeTotal: number;
  adicionar: (produtoId: number, qtd?: number) => void;
  definir: (produtoId: number, qtd: number) => void;
  remover: (produtoId: number) => void;
  limpar: () => void;
}
const Ctx = createContext<CartCtx | null>(null);

function ler(): ItemLocal[] {
  try {
    const v = JSON.parse(localStorage.getItem(CHAVE) ?? '[]');
    return Array.isArray(v) ? v.filter((i) => Number.isInteger(i?.produtoId) && Number.isInteger(i?.quantidade) && i.quantidade > 0) : [];
  } catch {
    return [];
  }
}

/** O carrinho vive no navegador (visitantes) e é sincronizado com a conta quando há login. Preços vêm sempre do servidor. */
export function CartProvider({ children }: { children: ReactNode }) {
  const { usuario } = useAuth();
  const [itens, setItens] = useState<ItemLocal[]>([]);
  const pronto = useRef(false);
  const sincronizado = useRef<number | null>(null);

  useEffect(() => { setItens(ler()); pronto.current = true; }, []);
  useEffect(() => { if (pronto.current) localStorage.setItem(CHAVE, JSON.stringify(itens)); }, [itens]);

  // Ao entrar: mescla o carrinho salvo na conta com o local (maior quantidade por produto).
  useEffect(() => {
    if (!usuario || sincronizado.current === usuario.id) return;
    sincronizado.current = usuario.id;
    api<{ itens: ItemLocal[] }>('/carrinho').then((r) => {
      setItens((local) => {
        const mapa = new Map<number, number>();
        for (const i of [...r.itens, ...local]) mapa.set(i.produtoId, Math.min(MAX, Math.max(mapa.get(i.produtoId) ?? 0, i.quantidade)));
        return [...mapa].map(([produtoId, quantidade]) => ({ produtoId, quantidade }));
      });
    }).catch(() => {});
  }, [usuario]);
  useEffect(() => { if (!usuario) sincronizado.current = null; }, [usuario]);

  // Salva na conta (com atraso) quando o carrinho muda e há login.
  useEffect(() => {
    if (!usuario || sincronizado.current !== usuario.id || !pronto.current) return;
    const t = setTimeout(() => { api('/carrinho', { method: 'PUT', body: { itens } }).catch(() => {}); }, 800);
    return () => clearTimeout(t);
  }, [itens, usuario]);

  const adicionar = useCallback((produtoId: number, qtd = 1) => {
    setItens((cur) => {
      const ex = cur.find((i) => i.produtoId === produtoId);
      if (ex) return cur.map((i) => (i.produtoId === produtoId ? { ...i, quantidade: Math.min(MAX, i.quantidade + qtd) } : i));
      return [...cur, { produtoId, quantidade: Math.min(MAX, qtd) }];
    });
  }, []);
  const definir = useCallback((produtoId: number, qtd: number) => {
    setItens((cur) => (qtd <= 0 ? cur.filter((i) => i.produtoId !== produtoId) : cur.map((i) => (i.produtoId === produtoId ? { ...i, quantidade: Math.min(MAX, qtd) } : i))));
  }, []);
  const remover = useCallback((produtoId: number) => setItens((cur) => cur.filter((i) => i.produtoId !== produtoId)), []);
  const limpar = useCallback(() => setItens([]), []);

  const valor = useMemo(() => ({ itens, quantidadeTotal: itens.reduce((s, i) => s + i.quantidade, 0), adicionar, definir, remover, limpar }), [itens, adicionar, definir, remover, limpar]);
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useCart fora do CartProvider');
  return c;
}
