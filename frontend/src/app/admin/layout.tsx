'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Carregando, Cruz } from '@/components/ui';
import { useAuth } from '@/lib/auth';

const MENU = [
  { href: '/admin', rotulo: 'Painel', admin: false },
  { href: '/admin/pedidos', rotulo: 'Pedidos', admin: false },
  { href: '/admin/produtos', rotulo: 'Produtos', admin: true },
  { href: '/admin/estoque', rotulo: 'Estoque', admin: false },
  { href: '/admin/clientes', rotulo: 'Clientes', admin: true },
  { href: '/admin/banners', rotulo: 'Banners', admin: true },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { usuario, carregando, equipe } = useAuth();
  const router = useRouter();
  const path = usePathname();

  useEffect(() => { if (!carregando && (!usuario || !equipe)) router.replace('/login?next=/admin'); }, [carregando, usuario, equipe, router]);
  if (carregando || !usuario || !equipe) return <Carregando />;

  const ehAdmin = usuario.perfil === 'ADMINISTRADOR';
  return (
    <div className="container-lumen grid gap-6 py-8 md:grid-cols-[220px_1fr]">
      <aside className="card h-fit p-3" aria-label="Menu do painel">
        <p className="flex items-center gap-2 px-3 py-2 font-extrabold text-roxo-700"><Cruz className="h-5 w-5 text-ouro-500" /> Painel da loja</p>
        <nav className="flex flex-row flex-wrap gap-1 md:flex-col">
          {MENU.filter((m) => ehAdmin || !m.admin).map((m) => {
            const ativo = m.href === '/admin' ? path === '/admin' : path.startsWith(m.href);
            return <Link key={m.href} href={m.href} aria-current={ativo ? 'page' : undefined} className={`rounded-lg px-3 py-2 text-sm font-semibold ${ativo ? 'bg-roxo-700 text-white' : 'text-roxo-700 hover:bg-roxo-100'}`}>{m.rotulo}</Link>;
          })}
        </nav>
        <p className="mt-3 border-t border-tinta-100 px-3 pt-3 text-xs text-tinta-600">{usuario.nome}<br />{usuario.perfil === 'ADMINISTRADOR' ? 'Administrador' : 'Atendente'}</p>
      </aside>
      <section className="min-w-0">{children}</section>
    </div>
  );
}
