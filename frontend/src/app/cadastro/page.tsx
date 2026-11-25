'use client';
import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Aviso, Button, Campo, Input } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { ApiError } from '@/lib/http';
import { destinoSeguro } from '@/lib/redirect';
import { cadastroSchema, type CadastroInput } from '@/lib/schemas';

function Form() {
  const { cadastrar } = useAuth();
  const router = useRouter();
  const next = destinoSeguro(useSearchParams().get('next'));
  const [erro, setErro] = useState<string[]>([]);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<CadastroInput>({
    resolver: zodResolver(cadastroSchema),
    defaultValues: { aceiteMarketing: false },
  });

  const enviar = handleSubmit(async (d) => {
    setErro([]);
    try { await cadastrar(d); router.push(next); }
    catch (e) {
      if (e instanceof ApiError) setErro(e.erros?.length ? e.erros.map((x) => x.mensagem) : [e.message]);
      else setErro(['Não foi possível concluir o cadastro. Tente novamente.']);
    }
  });

  return (
    <div className="container-lumen flex justify-center py-14">
      <form onSubmit={enviar} className="card w-full max-w-lg space-y-5 p-8" noValidate>
        <h1 className="text-3xl">Criar conta</h1>
        {erro.length > 0 && <Aviso tipo="erro">{erro.map((m, i) => <span key={i} className="block">{m}</span>)}</Aviso>}
        <Campo rotulo="Nome completo" erro={errors.nome?.message}><Input autoComplete="name" {...register('nome')} /></Campo>
        <Campo rotulo="E-mail" erro={errors.email?.message}><Input type="email" autoComplete="email" {...register('email')} /></Campo>
        <Campo rotulo="Telefone (opcional)" erro={errors.telefone?.message}><Input type="tel" autoComplete="tel" placeholder="(12) 90000-0000" {...register('telefone')} /></Campo>
        <Campo rotulo="Senha" erro={errors.senha?.message} dica="Mínimo de 8 caracteres, com letras e números."><Input type="password" autoComplete="new-password" {...register('senha')} /></Campo>
        <div className="space-y-3 text-sm">
          <label className="flex items-start gap-3">
            <input type="checkbox" className="mt-1 h-5 w-5 accent-roxo-700" {...register('aceiteTermos')} />
            <span>Li e aceito os <Link href="/paginas/termos-de-compra" className="link" target="_blank">termos de compra</Link> e a <Link href="/paginas/politica-de-privacidade" className="link" target="_blank">política de privacidade</Link>.</span>
          </label>
          {errors.aceiteTermos && <p role="alert" className="font-medium text-erro">{errors.aceiteTermos.message}</p>}
          <label className="flex items-start gap-3">
            <input type="checkbox" className="mt-1 h-5 w-5 accent-roxo-700" {...register('aceiteMarketing')} />
            <span>Quero receber novidades e ofertas por e-mail (opcional).</span>
          </label>
        </div>
        <Button type="submit" className="w-full" disabled={isSubmitting}>{isSubmitting ? 'Criando conta…' : 'Criar conta'}</Button>
        <p className="text-sm">Já tem conta? <Link href={`/login?next=${encodeURIComponent(next)}`} className="link font-semibold">Entrar</Link></p>
      </form>
    </div>
  );
}
export default function Cadastro() { return <Suspense><Form /></Suspense>; }
