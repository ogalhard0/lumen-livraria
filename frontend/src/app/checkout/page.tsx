'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { Aviso, Button, Campo, Carregando, Input } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useCart } from '@/lib/cart';
import { api, ApiError } from '@/lib/http';
import { brl, cepMask } from '@/lib/format';
import { pedidoCriarSchema } from '@/lib/schemas';
import type { CarrinhoValidado, OpcaoFrete, Pedido } from '@/lib/types';

interface FormDados {
  tipoEntrega: 'ENVIO' | 'RETIRADA'; telefone: string;
  cep: string; logradouro: string; numero: string; complemento: string; bairro: string; cidade: string; uf: string;
}

export default function Checkout() {
  const router = useRouter();
  const { usuario, carregando } = useAuth();
  const { itens, limpar } = useCart();
  const [opcoes, setOpcoes] = useState<OpcaoFrete[]>([]);
  const [servico, setServico] = useState('');
  const [erroFrete, setErroFrete] = useState('');
  const [erro, setErro] = useState('');
  const { register, handleSubmit, watch, setValue, setError, formState: { errors, isSubmitting } } = useForm<FormDados>({
    defaultValues: { tipoEntrega: 'ENVIO', telefone: '', cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '' },
  });
  const tipo = watch('tipoEntrega');
  const cep = watch('cep');

  useEffect(() => { if (!carregando && !usuario) router.replace('/login?next=/checkout'); }, [carregando, usuario, router]);
  useEffect(() => { if (usuario?.telefone) setValue('telefone', usuario.telefone); }, [usuario, setValue]);

  const carrinho = useQuery({
    queryKey: ['carrinho', itens],
    queryFn: () => api<CarrinhoValidado>('/carrinho/validar', { method: 'POST', body: { itens }, auth: false }),
    enabled: itens.length > 0,
  });

  // CEP completo: preenche o endereço (ViaCEP) e calcula o frete.
  useEffect(() => {
    if (tipo !== 'ENVIO' || cep.length !== 9) { setOpcoes([]); return; }
    let ativo = true;
    setErroFrete('');
    api<{ logradouro: string; bairro: string; cidade: string; uf: string }>(`/cep/${cep.replace('-', '')}`, { auth: false })
      .then((e) => { if (!ativo) return; setValue('logradouro', e.logradouro || ''); setValue('bairro', e.bairro || ''); setValue('cidade', e.cidade); setValue('uf', e.uf); })
      .catch(() => {});
    api<{ opcoes: OpcaoFrete[] }>('/frete/calcular', { method: 'POST', body: { cep, itens }, auth: false })
      .then((r) => { if (!ativo) return; const o = r.opcoes.filter((x) => x.codigo !== 'RETIRADA'); setOpcoes(o); setServico((s) => (o.some((x) => x.codigo === s) ? s : o[0]?.codigo ?? '')); })
      .catch((e) => { if (ativo) setErroFrete(e instanceof ApiError ? e.message : 'Não foi possível calcular o frete.'); });
    return () => { ativo = false; };
  }, [cep, tipo, itens, setValue]);

  const escolhida = opcoes.find((o) => o.codigo === servico);
  const subtotal = carrinho.data?.subtotal ?? 0;
  const frete = tipo === 'ENVIO' ? escolhida?.preco ?? 0 : 0;

  const enviar = handleSubmit(async (d) => {
    setErro('');
    const payload = {
      itens,
      tipoEntrega: d.tipoEntrega,
      telefone: d.telefone,
      endereco: d.tipoEntrega === 'ENVIO' ? { cep: d.cep, logradouro: d.logradouro, numero: d.numero, complemento: d.complemento, bairro: d.bairro, cidade: d.cidade, uf: d.uf } : undefined,
      servicoFrete: d.tipoEntrega === 'ENVIO' ? servico : undefined,
    };
    const v = pedidoCriarSchema.safeParse(payload);
    if (!v.success) {
      for (const i of v.error.issues) {
        const campo = i.path[0] === 'endereco' ? (i.path[1] as keyof FormDados) : (i.path[0] as keyof FormDados);
        if (campo && campo in d) setError(campo, { message: i.message });
        else if (i.path[0] === 'servicoFrete') setErroFrete(i.message);
      }
      return;
    }
    try {
      const p = await api<Pedido>('/pedidos', { method: 'POST', body: v.data });
      limpar();
      router.push(`/pedido/${p.numero}`);
    } catch (e) { setErro(e instanceof ApiError ? e.message : 'Não foi possível criar o pedido.'); }
  });

  if (carregando || !usuario) return <Carregando />;
  if (!itens.length) return <div className="container-lumen py-20 text-center"><p>Seu carrinho está vazio.</p></div>;

  return (
    <div className="container-lumen py-8">
      <h1 className="text-3xl">Finalizar compra</h1>
      <ol className="mt-4 flex gap-2 text-sm font-semibold" aria-label="Etapas">
        <li className="rounded-full bg-roxo-700 px-4 py-1 text-white">1. Entrega</li>
        <li className="rounded-full bg-roxo-100 px-4 py-1 text-roxo-700">2. Pagamento</li>
        <li className="rounded-full bg-roxo-100 px-4 py-1 text-roxo-700">3. Confirmação</li>
      </ol>

      <form onSubmit={enviar} noValidate className="mt-6 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {erro && <Aviso tipo="erro">{erro}</Aviso>}
          <fieldset className="card space-y-3 p-5">
            <legend className="px-1 text-lg font-bold text-roxo-900">Como deseja receber?</legend>
            {[['ENVIO', '🚚 Entrega no meu endereço', 'Calculamos o frete pelo CEP'], ['RETIRADA', '⛪ Retirar na loja', 'Gratuito, em Guaratinguetá']].map(([v, t, d]) => (
              <label key={v} className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-4 ${tipo === v ? 'border-roxo-700 bg-roxo-50' : 'border-tinta-100'}`}>
                <input type="radio" value={v} className="h-5 w-5 accent-roxo-700" {...register('tipoEntrega')} />
                <span><span className="block font-semibold">{t}</span><span className="text-sm text-tinta-600">{d}</span></span>
              </label>
            ))}
          </fieldset>

          <fieldset className="card space-y-4 p-5">
            <legend className="px-1 text-lg font-bold text-roxo-900">Contato</legend>
            <Campo rotulo="Telefone / WhatsApp" erro={errors.telefone?.message}><Input type="tel" autoComplete="tel" placeholder="(12) 90000-0000" {...register('telefone')} /></Campo>
          </fieldset>

          {tipo === 'ENVIO' && (
            <fieldset className="card space-y-4 p-5">
              <legend className="px-1 text-lg font-bold text-roxo-900">Endereço de entrega</legend>
              <div className="grid gap-4 sm:grid-cols-3">
                <Campo rotulo="CEP" erro={errors.cep?.message}><Input inputMode="numeric" autoComplete="postal-code" placeholder="00000-000" {...register('cep', { onChange: (e) => setValue('cep', cepMask(e.target.value)) })} /></Campo>
                <div className="sm:col-span-2"><Campo rotulo="Rua / Avenida" erro={errors.logradouro?.message}><Input autoComplete="address-line1" {...register('logradouro')} /></Campo></div>
                <Campo rotulo="Número" erro={errors.numero?.message}><Input {...register('numero')} /></Campo>
                <div className="sm:col-span-2"><Campo rotulo="Complemento (opcional)" erro={errors.complemento?.message}><Input {...register('complemento')} /></Campo></div>
                <Campo rotulo="Bairro" erro={errors.bairro?.message}><Input {...register('bairro')} /></Campo>
                <Campo rotulo="Cidade" erro={errors.cidade?.message}><Input autoComplete="address-level2" {...register('cidade')} /></Campo>
                <Campo rotulo="UF" erro={errors.uf?.message}><Input maxLength={2} autoComplete="address-level1" {...register('uf')} /></Campo>
              </div>
              {erroFrete && <Aviso tipo="erro">{erroFrete}</Aviso>}
              {opcoes.length > 0 && (
                <div role="radiogroup" aria-label="Opções de frete" className="space-y-2">
                  <p className="text-sm font-semibold">Escolha o frete</p>
                  {opcoes.map((o) => (
                    <label key={o.codigo} className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border-2 p-3 ${servico === o.codigo ? 'border-roxo-700 bg-roxo-50' : 'border-tinta-100'}`}>
                      <span className="flex items-center gap-3"><input type="radio" name="frete" className="h-5 w-5 accent-roxo-700" checked={servico === o.codigo} onChange={() => setServico(o.codigo)} />
                        <span>{o.nome}<span className="block text-sm text-tinta-600">até {o.prazoDias} dias úteis</span></span></span>
                      <strong>{o.preco === 0 ? 'Grátis' : brl(o.preco)}</strong>
                    </label>
                  ))}
                </div>
              )}
            </fieldset>
          )}
        </div>

        <aside className="card h-fit space-y-3 p-5" aria-label="Resumo">
          <h2 className="text-xl">Resumo do pedido</h2>
          {carrinho.data?.linhas.map((l) => (
            <div key={l.produtoId} className="flex justify-between gap-3 text-sm"><span>{l.quantidade}× {l.titulo}</span><span className="font-semibold">{brl(l.subtotal)}</span></div>
          ))}
          <div className="flex justify-between border-t border-tinta-100 pt-3"><span>Subtotal</span><strong>{brl(subtotal)}</strong></div>
          <div className="flex justify-between"><span>Frete</span><strong>{tipo === 'RETIRADA' ? 'Grátis' : escolhida ? (escolhida.preco === 0 ? 'Grátis' : brl(escolhida.preco)) : '—'}</strong></div>
          <div className="flex justify-between border-t border-tinta-100 pt-3 text-xl"><span>Total</span><strong className="text-roxo-700">{brl(subtotal + frete)}</strong></div>
          <Button type="submit" variante="ouro" className="w-full" disabled={isSubmitting || !carrinho.data?.podeFinalizar}>{isSubmitting ? 'Criando pedido…' : 'Ir para o pagamento'}</Button>
          <p className="text-xs text-tinta-600">Ao continuar, reservamos os itens por tempo limitado até a confirmação do pagamento.</p>
        </aside>
      </form>
    </div>
  );
}
