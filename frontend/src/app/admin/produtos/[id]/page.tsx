'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { BookCover } from '@/components/BookCover';
import { Aviso, Button, Campo, Carregando, Input, Select, Textarea } from '@/components/ui';
import { api, ApiError } from '@/lib/http';
import { produtoAdminSchema, type ProdutoAdminInput } from '@/lib/schemas';
import type { Categoria } from '@/lib/types';

export default function ProdutoForm() {
  const { id } = useParams<{ id: string }>();
  const novo = id === 'novo';
  const router = useRouter();
  const [erro, setErro] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);
  const categorias = useQuery({ queryKey: ['categorias'], queryFn: () => api<Categoria[]>('/categorias', { auth: false }) });
  const atual = useQuery({ queryKey: ['admin-produto', id], queryFn: () => api<ProdutoAdminInput & { id: number; estoqueAtual: number }>(`/admin/produtos/${id}`), enabled: !novo });

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<ProdutoAdminInput>({
    resolver: zodResolver(produtoAdminSchema) as any,
    defaultValues: { formato: 'FISICO', idioma: 'pt-BR', ativo: true, destaque: false, estoqueMinimo: 3, pesoGramas: 400, alturaCm: 3, larguraCm: 16, comprimentoCm: 23, estoqueInicial: 0 } as Partial<ProdutoAdminInput> as ProdutoAdminInput,
  });
  useEffect(() => { if (atual.data) reset({ ...atual.data, imagem: atual.data.imagem ?? '' } as ProdutoAdminInput); }, [atual.data, reset]);

  const imagem = watch('imagem');
  const titulo = watch('titulo');

  async function subir(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setEnviando(true); setErro([]);
    try {
      const fd = new FormData(); fd.append('arquivo', f);
      const r = await api<{ url: string }>('/admin/uploads', { method: 'POST', formData: fd });
      setValue('imagem', r.url);
    } catch (err) { setErro([err instanceof ApiError ? err.message : 'Falha no envio da imagem.']); }
    finally { setEnviando(false); }
  }

  const enviar = handleSubmit(async (d) => {
    setErro([]);
    try {
      if (novo) await api('/admin/produtos', { method: 'POST', body: d });
      else { const { estoqueInicial, ...resto } = d; void estoqueInicial; await api(`/admin/produtos/${id}`, { method: 'PATCH', body: resto }); }
      router.push('/admin/produtos');
    } catch (e) { setErro(e instanceof ApiError ? (e.erros?.length ? e.erros.map((x) => `${x.campo}: ${x.mensagem}`) : [e.message]) : ['Erro ao salvar.']); }
  });

  if (!novo && atual.isLoading) return <Carregando />;
  return (
    <form onSubmit={enviar} noValidate className="space-y-6">
      <h1 className="text-3xl">{novo ? 'Novo produto' : 'Editar produto'}</h1>
      {erro.length > 0 && <Aviso tipo="erro">{erro.map((m, i) => <span key={i} className="block">{m}</span>)}</Aviso>}
      <div className="grid gap-6 lg:grid-cols-[1fr_220px]">
        <div className="card space-y-4 p-5">
          <Campo rotulo="Título" erro={errors.titulo?.message}><Input {...register('titulo')} /></Campo>
          <Campo rotulo="Autor" erro={errors.autor?.message}><Input {...register('autor')} /></Campo>
          <Campo rotulo="Descrição" erro={errors.descricao?.message}><Textarea rows={5} {...register('descricao')} /></Campo>
          <div className="grid gap-4 sm:grid-cols-3">
            <Campo rotulo="Categoria" erro={errors.categoriaId?.message}>
              <Select {...register('categoriaId')}><option value="">Selecione</option>
                {categorias.data?.map((c) => [<option key={c.id} value={c.id}>{c.nome}</option>, ...c.filhas.map((f) => <option key={f.id} value={f.id}>— {f.nome}</option>)])}
              </Select>
            </Campo>
            <Campo rotulo="Preço (R$)" erro={errors.preco?.message}><Input type="number" step="0.01" min="0" {...register('preco')} /></Campo>
            <Campo rotulo="Idioma" erro={errors.idioma?.message}><Select {...register('idioma')}><option value="pt-BR">Português</option><option value="es">Espanhol</option></Select></Campo>
          </div>
          <div className="grid gap-4 sm:grid-cols-4">
            {!novo ? null : <Campo rotulo="Estoque inicial" erro={errors.estoqueInicial?.message}><Input type="number" min="0" {...register('estoqueInicial')} /></Campo>}
            <Campo rotulo="Estoque mínimo" erro={errors.estoqueMinimo?.message} dica="Abaixo disso, o painel alerta."><Input type="number" min="0" {...register('estoqueMinimo')} /></Campo>
            <Campo rotulo="Peso (g)" erro={errors.pesoGramas?.message}><Input type="number" min="1" {...register('pesoGramas')} /></Campo>
            <Campo rotulo="Formato"><Select {...register('formato')}><option value="FISICO">Físico</option></Select></Campo>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Campo rotulo="Altura (cm)"><Input type="number" min="1" {...register('alturaCm')} /></Campo>
            <Campo rotulo="Largura (cm)"><Input type="number" min="1" {...register('larguraCm')} /></Campo>
            <Campo rotulo="Comprimento (cm)"><Input type="number" min="1" {...register('comprimentoCm')} /></Campo>
          </div>
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2"><input type="checkbox" className="h-5 w-5 accent-roxo-700" {...register('ativo')} /> Ativo na loja</label>
            <label className="flex items-center gap-2"><input type="checkbox" className="h-5 w-5 accent-roxo-700" {...register('destaque')} /> Destacar na página inicial</label>
          </div>
        </div>
        <div className="card h-fit space-y-3 p-4">
          <div className="aspect-[4/5] overflow-hidden rounded-xl"><BookCover titulo={titulo || 'Capa'} imagem={imagem || null} /></div>
          <label className="block text-sm font-semibold">Imagem da capa (JPG, PNG ou WebP, até 2 MB)
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={subir} disabled={enviando} className="mt-1 block w-full text-sm" />
          </label>
          {imagem && <Button type="button" variante="fantasma" className="!py-1 text-sm" onClick={() => setValue('imagem', '')}>Remover imagem</Button>}
        </div>
      </div>
      <div className="flex gap-3"><Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Salvando…' : 'Salvar produto'}</Button><Button type="button" variante="contorno" onClick={() => router.push('/admin/produtos')}>Cancelar</Button></div>
    </form>
  );
}
