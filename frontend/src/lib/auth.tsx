'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, renovarSessao, setToken } from './http';
import type { Usuario } from './types';
import type { CadastroInput } from './schemas';

interface AuthCtx {
  usuario: Usuario | null;
  carregando: boolean;
  entrar: (email: string, senha: string) => Promise<Usuario>;
  cadastrar: (d: CadastroInput) => Promise<Usuario>;
  sair: () => Promise<void>;
  equipe: boolean;
}
const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const ouvir = (e: Event) => setUsuario((e as CustomEvent<Usuario | null>).detail);
    window.addEventListener('lumen:sessao', ouvir);
    renovarSessao().finally(() => setCarregando(false)); // restaura a sessão pelo cookie httpOnly
    return () => window.removeEventListener('lumen:sessao', ouvir);
  }, []);

  const iniciar = (d: { accessToken: string; usuario: Usuario }) => { setToken(d.accessToken); setUsuario(d.usuario); return d.usuario; };

  const entrar = useCallback(async (email: string, senha: string) => iniciar(await api('/auth/login', { method: 'POST', body: { email, senha }, auth: false })), []);
  const cadastrar = useCallback(async (dto: CadastroInput) => iniciar(await api('/auth/cadastro', { method: 'POST', body: dto, auth: false })), []);
  const sair = useCallback(async () => {
    await fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'include', headers: { 'X-Requested-With': 'lumen' } }).catch(() => {});
    setToken(null);
    setUsuario(null);
  }, []);

  const valor = useMemo(
    () => ({ usuario, carregando, entrar, cadastrar, sair, equipe: usuario?.perfil === 'ATENDENTE' || usuario?.perfil === 'ADMINISTRADOR' }),
    [usuario, carregando, entrar, cadastrar, sair],
  );
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth fora do AuthProvider');
  return c;
}
