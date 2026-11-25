/** Cliente HTTP do navegador: token de acesso em memória (nunca em localStorage) e renovação via cookie httpOnly. */
import type { Usuario } from './types';

let token: string | null = null;
let renovando: Promise<boolean> | null = null;

export function setToken(t: string | null) { token = t; }
export function getToken() { return token; }

export class ApiError extends Error {
  constructor(public status: number, message: string, public erros?: { campo: string; mensagem: string }[]) {
    super(message);
  }
}

function emitirSessao(u: Usuario | null) {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('lumen:sessao', { detail: u }));
}

/** Renovação única (várias chamadas simultâneas compartilham a mesma requisição). */
export function renovarSessao(): Promise<boolean> {
  renovando ??= (async () => {
    try {
      const r = await fetch('/api/v1/auth/refresh', { method: 'POST', credentials: 'include', headers: { 'X-Requested-With': 'lumen' } });
      if (!r.ok) { token = null; emitirSessao(null); return false; }
      const d = (await r.json()) as { accessToken: string; usuario: Usuario };
      token = d.accessToken;
      emitirSessao(d.usuario);
      return true;
    } catch {
      return false;
    } finally {
      setTimeout(() => { renovando = null; }, 0);
    }
  })();
  return renovando;
}

interface Opcoes { method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'; body?: unknown; auth?: boolean; formData?: FormData }

export async function api<T = unknown>(caminho: string, o: Opcoes = {}): Promise<T> {
  const executar = () =>
    fetch(`/api/v1${caminho}`, {
      method: o.method ?? 'GET',
      credentials: 'include',
      headers: {
        ...(o.formData ? {} : { 'Content-Type': 'application/json' }),
        ...(o.auth !== false && token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: o.formData ?? (o.body !== undefined ? JSON.stringify(o.body) : undefined),
    });
  let r = await executar();
  if (r.status === 401 && o.auth !== false && !caminho.startsWith('/auth/')) {
    if (await renovarSessao()) r = await executar();
  }
  if (r.status === 204) return undefined as T;
  const dados = await r.json().catch(() => null);
  if (!r.ok) throw new ApiError(r.status, dados?.mensagem ?? 'Não foi possível concluir a operação.', dados?.erros);
  return dados as T;
}
