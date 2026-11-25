import { LinkButton } from '@/components/ui';

export default function NotFound() {
  return (
    <div className="container-lumen py-24 text-center">
      <p className="text-6xl font-extrabold text-ouro-500">404</p>
      <h1 className="mt-4 text-3xl">Página não encontrada</h1>
      <p className="mt-2 text-tinta-600">O endereço pode ter mudado ou o produto não está mais disponível.</p>
      <div className="mt-8 flex justify-center gap-3">
        <LinkButton href="/">Voltar ao início</LinkButton>
        <LinkButton href="/catalogo" variante="contorno">Ver catálogo</LinkButton>
      </div>
    </div>
  );
}
