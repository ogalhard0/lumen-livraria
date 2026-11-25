import Link from 'next/link';
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { forwardRef } from 'react';

type Variante = 'primario' | 'ouro' | 'contorno' | 'fantasma' | 'perigo';
const base = 'inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed';
const variantes: Record<Variante, string> = {
  primario: 'bg-roxo-700 text-white hover:bg-roxo-900',
  ouro: 'bg-ouro-500 text-roxo-900 hover:bg-ouro-300',
  contorno: 'border-2 border-roxo-700 text-roxo-700 bg-white hover:bg-roxo-50',
  fantasma: 'text-roxo-700 hover:bg-roxo-100',
  perigo: 'bg-erro text-white hover:opacity-90',
};
export const classeBotao = (v: Variante = 'primario', extra = '') => `${base} ${variantes[v]} ${extra}`;

export function Button({ variante = 'primario', className = '', ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante }) {
  return <button {...p} className={classeBotao(variante, className)} />;
}
export function LinkButton({ href, variante = 'primario', className = '', children }: { href: string; variante?: Variante; className?: string; children: ReactNode }) {
  return <Link href={href} className={classeBotao(variante, className)}>{children}</Link>;
}

const campo = 'w-full rounded-xl border border-tinta-300 bg-white px-4 py-3 text-base placeholder:text-tinta-600/60 focus:border-roxo-500';
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className = '', ...p }, ref) {
  return <input ref={ref} {...p} className={`${campo} ${className}`} />;
});
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className = '', ...p }, ref) {
  return <select ref={ref} {...p} className={`${campo} ${className}`} />;
});
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className = '', ...p }, ref) {
  return <textarea ref={ref} {...p} className={`${campo} ${className}`} />;
});

export function Campo({ rotulo, erro, children, dica }: { rotulo: string; erro?: string; children: ReactNode; dica?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-tinta-900">{rotulo}</span>
      {children}
      {dica && !erro && <span className="mt-1 block text-sm text-tinta-600">{dica}</span>}
      {erro && <span role="alert" className="mt-1 block text-sm font-medium text-erro">{erro}</span>}
    </label>
  );
}

export function Aviso({ tipo = 'info', children }: { tipo?: 'info' | 'erro' | 'ok' | 'alerta'; children: ReactNode }) {
  const cores = { info: 'bg-roxo-50 border-roxo-300 text-roxo-900', erro: 'bg-red-50 border-erro text-erro', ok: 'bg-green-50 border-ok text-ok', alerta: 'bg-ouro-100 border-ouro-500 text-roxo-900' };
  return <div role={tipo === 'erro' ? 'alert' : 'status'} className={`rounded-xl border px-4 py-3 text-sm font-medium ${cores[tipo]}`}>{children}</div>;
}

export function Selo({ cor = 'roxo', children }: { cor?: 'roxo' | 'ouro' | 'ok' | 'erro' | 'cinza'; children: ReactNode }) {
  const c = { roxo: 'bg-roxo-100 text-roxo-900', ouro: 'bg-ouro-100 text-ouro-700', ok: 'bg-green-100 text-ok', erro: 'bg-red-100 text-erro', cinza: 'bg-tinta-100 text-tinta-600' };
  return <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${c[cor]}`}>{children}</span>;
}

export function Carregando({ texto = 'Carregando…' }: { texto?: string }) {
  return <p role="status" className="py-10 text-center text-tinta-600">{texto}</p>;
}

/** Paginação por links (funciona sem JavaScript e é amigável a buscadores). */
export function Paginacao({ pagina, totalPaginas, href }: { pagina: number; totalPaginas: number; href: (p: number) => string }) {
  if (totalPaginas <= 1) return null;
  return (
    <nav aria-label="Paginação" className="mt-8 flex items-center justify-center gap-3">
      {pagina > 1 && <Link href={href(pagina - 1)} className={classeBotao('contorno', '!py-2')}>‹ Anterior</Link>}
      <span className="text-sm text-tinta-600">Página {pagina} de {totalPaginas}</span>
      {pagina < totalPaginas && <Link href={href(pagina + 1)} className={classeBotao('contorno', '!py-2')}>Próxima ›</Link>}
    </nav>
  );
}

export const Cruz = ({ className = 'h-6 w-6' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
    <path d="M12 2v20M6 8h12" />
  </svg>
);
