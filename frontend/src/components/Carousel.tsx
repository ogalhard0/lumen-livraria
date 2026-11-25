'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { Banner } from '@/lib/types';
import { Cruz, classeBotao } from './ui';

export function Carousel({ banners }: { banners: Banner[] }) {
  const [i, setI] = useState(0);
  const [pausado, setPausado] = useState(false);
  useEffect(() => {
    if (pausado || banners.length < 2) return;
    const t = setInterval(() => setI((x) => (x + 1) % banners.length), 6000);
    return () => clearInterval(t);
  }, [pausado, banners.length]);

  const b = banners[i];
  if (!b) return null;
  return (
    <section
      aria-roledescription="carrossel"
      aria-label="Destaques"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      className="relative overflow-hidden bg-gradient-to-br from-roxo-900 via-roxo-700 to-roxo-900 text-white"
    >
      <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full border-2 border-ouro-500/40" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-32 right-24 h-72 w-72 rounded-full border border-ouro-300/30" aria-hidden="true" />
      <div className="container-lumen relative flex min-h-[360px] flex-col justify-center gap-5 py-14 md:min-h-[440px]">
        <span className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.2em] text-ouro-300"><Cruz className="h-5 w-5" /> Livraria católica</span>
        <h1 aria-live="polite" className="max-w-2xl text-3xl font-extrabold leading-tight text-white md:text-5xl">{b.titulo}</h1>
        {b.subtitulo && <p className="max-w-xl text-lg text-roxo-100">{b.subtitulo}</p>}
        {b.link && <Link href={b.link} className={classeBotao('ouro', 'w-fit')}>Ver ofertas</Link>}
        {banners.length > 1 && (
          <div className="mt-2 flex gap-2" role="tablist" aria-label="Escolher destaque">
            {banners.map((x, n) => (
              <button key={x.id} role="tab" aria-selected={n === i} aria-label={`Destaque ${n + 1}`} onClick={() => setI(n)}
                className={`h-3 rounded-full transition-all ${n === i ? 'w-8 bg-ouro-500' : 'w-3 bg-white/40'}`} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
