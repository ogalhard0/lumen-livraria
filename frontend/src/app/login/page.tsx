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
import { loginSchema, type LoginInput } from '@/lib/schemas';

function Form() {
  const { entrar } = useAuth();
  const router = useRouter();
  const next = destinoSeguro(useSearchParams().get('next'));
  const [erro, setErro] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const enviar = handleSubmit(async (d) => {
    setErro('');
    try { await entrar(d.email, d.senha); router.push(next); }
    catch (e) { setErro(e instanceof ApiError ? e.message : 'Não foi possível entrar. Tente novamente.'); }
  });

  return (
    <div className="container-lumen flex justify-center py-14">
      <form onSubmit={enviar} className="card w-full max-w-md space-y-5 p-8" noValidate>
        <h1 className="text-3xl">Entrar</h1>
        <p className="text-tinta-600">Acesse sua conta para finalizar compras e acompanhar pedidos.</p>
        {erro && <Aviso tipo="erro">{erro}</Aviso>}
        <Campo rotulo="E-mail" erro={errors.email?.message}><Input type="email" autoComplete="email" {...register('email')} /></Campo>
        <Campo rotulo="Senha" erro={errors.senha?.message}><Input type="password" autoComplete="current-password" {...register('senha')} /></Campo>
        <Button type="submit" className="w-full" disabled={isSubmitting}>{isSubmitting ? 'Entrando…' : 'Entrar'}</Button>
        <div className="flex flex-col gap-1 text-sm">
          <Link href="/recuperar-senha" className="link">Esqueci minha senha</Link>
          <span>Ainda não tem conta? <Link href={`/cadastro?next=${encodeURIComponent(next)}`} className="link font-semibold">Cadastre-se</Link></span>
        </div>
      </form>
    </div>
  );
}
export default function Login() { return <Suspense><Form /></Suspense>; }
