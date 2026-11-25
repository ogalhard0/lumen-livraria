import Link from 'next/link';
import { Cruz } from './ui';

export function Footer() {
  const email = process.env.NEXT_PUBLIC_CONTATO_EMAIL ?? 'contato@lumenlivraria.com.br';
  const tel = process.env.NEXT_PUBLIC_CONTATO_TELEFONE ?? '';
  const whats = process.env.NEXT_PUBLIC_WHATSAPP ?? '';
  return (
    <footer className="mt-16 bg-roxo-900 text-roxo-100">
      <div className="container-lumen grid gap-8 py-12 md:grid-cols-3">
        <div>
          <p className="flex items-center gap-2 text-2xl font-extrabold text-ouro-300"><Cruz className="h-6 w-6" /> Lumen</p>
          <p className="mt-2 text-sm">Fé que ilumina. Palavras que transformam.</p>
        </div>
        <nav aria-label="Institucional" className="flex flex-col gap-2 text-sm">
          <h2 className="mb-1 text-base font-bold text-white">Institucional</h2>
          <Link className="hover:text-ouro-300" href="/paginas/quem-somos">Quem somos</Link>
          <Link className="hover:text-ouro-300" href="/paginas/politica-de-privacidade">Política de privacidade</Link>
          <Link className="hover:text-ouro-300" href="/paginas/trocas-e-devolucoes">Trocas e devoluções</Link>
          <Link className="hover:text-ouro-300" href="/paginas/termos-de-compra">Termos de compra</Link>
        </nav>
        <div className="flex flex-col gap-2 text-sm">
          <h2 className="mb-1 text-base font-bold text-white">Atendimento</h2>
          <a className="hover:text-ouro-300" href={`mailto:${email}`}>{email}</a>
          {tel && <span>{tel}</span>}
          {whats && <a className="mt-1 w-fit rounded-xl bg-ouro-500 px-4 py-2 font-bold text-roxo-900 hover:bg-ouro-300" href={`https://wa.me/${whats}`} target="_blank" rel="noopener noreferrer">Falar no WhatsApp</a>}
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs">© {new Date().getFullYear()} Lumen Livraria Católica</div>
    </footer>
  );
}
