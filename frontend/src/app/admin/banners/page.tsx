'use client';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Aviso, Button, Campo, Carregando, Input, Selo } from '@/components/ui';
import { api, ApiError } from '@/lib/http';
import { bannerSchema, type BannerInput } from '@/lib/schemas';

interface B extends Omit<BannerInput, 'inicio' | 'fim'> { id: number }

export default function Banners() {
  const qc = useQueryClient();
  const [editando, setEditando] = useState<number | 'novo' | null>(null);
  const [erro, setErro] = useState('');
  const lista = useQuery({ queryKey: ['admin-banners'], queryFn: () => api<B[]>('/admin/banners') });
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<BannerInput>({ resolver: zodResolver(bannerSchema) as any, defaultValues: { ordem: 0, ativo: true } as BannerInput });
  const excluir = useMutation({ mutationFn: (id: number) => api(`/admin/banners/${id}`, { method: 'DELETE' }), onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-banners'] }) });

  const abrir = (b: B | null) => { setErro(''); setEditando(b ? b.id : 'novo'); reset(b ? { ...b, subtitulo: b.subtitulo ?? '', link: b.link ?? '', imagem: b.imagem ?? '' } as BannerInput : { titulo: '', subtitulo: '', link: '', imagem: '', ordem: 0, ativo: true } as BannerInput); };
  const salvar = handleSubmit(async (d) => {
    try {
      if (editando === 'novo') await api('/admin/banners', { method: 'POST', body: d }); else await api(`/admin/banners/${editando}`, { method: 'PUT', body: d });
      setEditando(null); qc.invalidateQueries({ queryKey: ['admin-banners'] });
    } catch (e) { setErro(e instanceof ApiError ? e.message : 'Erro ao salvar.'); }
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between"><h1 className="text-3xl">Banners da página inicial</h1><Button variante="ouro" onClick={() => abrir(null)}>+ Novo banner</Button></div>
      {editando !== null && (
        <form onSubmit={salvar} noValidate className="card space-y-4 p-5">
          <h2 className="text-xl">{editando === 'novo' ? 'Novo banner' : 'Editar banner'}</h2>
          {erro && <Aviso tipo="erro">{erro}</Aviso>}
          <Campo rotulo="Título" erro={errors.titulo?.message}><Input {...register('titulo')} /></Campo>
          <Campo rotulo="Subtítulo" erro={errors.subtitulo?.message}><Input {...register('subtitulo')} /></Campo>
          <div className="grid gap-4 sm:grid-cols-3">
            <Campo rotulo="Link interno" erro={errors.link?.message} dica="Ex.: /catalogo?categoria=liturgia"><Input {...register('link')} /></Campo>
            <Campo rotulo="Ordem" erro={errors.ordem?.message}><Input type="number" min="0" {...register('ordem')} /></Campo>
            <label className="flex items-center gap-2 pt-7"><input type="checkbox" className="h-5 w-5 accent-roxo-700" {...register('ativo')} /> Ativo</label>
          </div>
          <div className="flex gap-3"><Button type="submit" disabled={isSubmitting}>Salvar</Button><Button type="button" variante="contorno" onClick={() => setEditando(null)}>Cancelar</Button></div>
        </form>
      )}
      {lista.isLoading && <Carregando />}
      <ul className="space-y-3">
        {lista.data?.map((b) => (
          <li key={b.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
            <div><p className="font-bold">{b.titulo}</p><p className="text-sm text-tinta-600">{b.subtitulo}</p><p className="text-xs text-tinta-600">Ordem {b.ordem} · {b.link ?? 'sem link'}</p></div>
            <div className="flex items-center gap-2">{b.ativo ? <Selo cor="ok">Ativo</Selo> : <Selo cor="cinza">Inativo</Selo>}
              <Button variante="contorno" className="!px-3 !py-1.5 text-sm" onClick={() => abrir(b)}>Editar</Button>
              <Button variante="fantasma" className="!px-3 !py-1.5 text-sm !text-erro" onClick={() => confirm('Excluir este banner?') && excluir.mutate(b.id)}>Excluir</Button></div>
          </li>
        ))}
      </ul>
    </div>
  );
}
