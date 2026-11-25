import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/Providers';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { getJSONOu } from '@/lib/server-api';
import { SITE_URL } from '@/lib/format';
import type { Categoria } from '@/lib/types';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'Lumen Livraria Católica', template: '%s | Lumen Livraria Católica' },
  description: 'Livros, bíblias, devocionários, terços e artigos católicos com entrega para todo o Brasil. Fé que ilumina. Palavras que transformam.',
  openGraph: { type: 'website', locale: 'pt_BR', siteName: 'Lumen Livraria Católica' },
  manifest: '/manifest.webmanifest',
};
export const viewport: Viewport = { themeColor: '#4A2C7A', width: 'device-width', initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const categorias = await getJSONOu<Categoria[]>('/categorias', [], 300);
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className="font-sans">
        <Providers>
          <Header categorias={categorias} />
          <main id="conteudo" className="min-h-[60vh]">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
