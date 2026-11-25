import { Cruz } from './ui';

/** Capa genérica no padrão visual da marca (usada quando o produto ainda não tem foto). */
export function BookCover({ titulo, imagem, className = '' }: { titulo: string; imagem?: string | null; className?: string }) {
  if (imagem) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={imagem} alt={`Capa de ${titulo}`} loading="lazy" className={`h-full w-full object-cover ${className}`} />;
  }
  return (
    <div role="img" aria-label={`Capa de ${titulo}`} className={`flex h-full w-full items-center justify-center bg-gradient-to-br from-roxo-700 to-roxo-900 p-4 ${className}`}>
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-md border-2 border-ouro-500 p-3 text-center text-ouro-300">
        <Cruz className="h-9 w-9" />
        <span className="line-clamp-3 text-sm font-semibold leading-tight text-white">{titulo}</span>
      </div>
    </div>
  );
}
