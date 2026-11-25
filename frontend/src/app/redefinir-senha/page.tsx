'use client';
import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Aviso, Button, Campo, Input } from '@/components/ui';
import { api, ApiError } from '@/lib/http';

function Form() {
  const token = useSearchParams().get('token') ?? '';
  const [ok, setOk] = useState(false);
  const [erro, setErro] = useState<string[]>([]);
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<{ senha: string }>();
  const enviar = handleSubmit(async (d) => {
    setErro([]);
    try { await api('/auth/redefinir-senha', { method: 'POST', body: { token, senha: d.senha }, auth: false }); setOk(true); }
    catch (e) { setErro(e instanceof ApiError ? (e.erros?.length ? e.erros.map((x) => x.mensagem) : [e.message]) : ['Erro inesperado.']); }
  });
  return (
    <div className="container-lumen flex justify-center py-14">
      <form onSubmit={enviar} className="card w-full max-w-md space-y-5 p-8">
        <h1 className="text-3xl">Nova senha</h1>
        {ok ? (<><Aviso tipo="ok">Senha alterada com sucesso.</Aviso><Link href="/login" className="link font-semibold">Entrar</Link></>) : (<>
          {erro.length > 0 && <Aviso tipo="erro">{erro.map((m, i) => <span key={i} className="block">{m}</span>)}</Aviso>}
          <Campo rotulo="Nova senha" dica="Mínimo de 8 caracteres, com letras e números."><Input type="password" autoComplete="new-password" {...register('senha', { required: true })} /></Campo>
          <Button type="submit" className="w-full" disabled={isSubmitting || !token}>Salvar nova senha</Button>
        </>)}
      </form>
    </div>
  );
}
export default function Redefinir() { return <Suspense><Form /></Suspense>; }
