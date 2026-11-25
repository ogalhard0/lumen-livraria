'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Aviso, Button, Campo, Input } from '@/components/ui';
import { api } from '@/lib/http';
import { recuperarSenhaSchema } from '@/lib/schemas';

export default function Recuperar() {
  const [enviado, setEnviado] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<{ email: string }>({ resolver: zodResolver(recuperarSenhaSchema) });
  const enviar = handleSubmit(async (d) => { await api('/auth/recuperar-senha', { method: 'POST', body: d, auth: false }).catch(() => {}); setEnviado(true); });
  return (
    <div className="container-lumen flex justify-center py-14">
      <form onSubmit={enviar} className="card w-full max-w-md space-y-5 p-8" noValidate>
        <h1 className="text-3xl">Recuperar senha</h1>
        {enviado
          ? <Aviso tipo="ok">Se o e-mail estiver cadastrado, enviaremos um link para criar uma nova senha. Ele vale por 30 minutos.</Aviso>
          : (<>
              <p className="text-tinta-600">Informe o e-mail da sua conta e enviaremos um link de redefinição.</p>
              <Campo rotulo="E-mail" erro={errors.email?.message}><Input type="email" autoComplete="email" {...register('email')} /></Campo>
              <Button type="submit" className="w-full" disabled={isSubmitting}>Enviar link</Button>
            </>)}
      </form>
    </div>
  );
}
