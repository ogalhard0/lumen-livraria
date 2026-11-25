import type { MetadataRoute } from 'next';

/** Manifesto PWA: permite instalar a loja na tela inicial do celular. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Lumen Livraria Católica',
    short_name: 'Lumen',
    description: 'Livros, bíblias, terços e artigos católicos.',
    start_url: '/',
    display: 'standalone',
    background_color: '#FBF8F3',
    theme_color: '#4A2C7A',
    lang: 'pt-BR',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
