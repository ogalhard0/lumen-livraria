'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Aviso, Button, Carregando, Input, Selo } from '@/components/ui';
import { api, ApiError } from '@/lib/http';
import { brl, COR_STATUS, dataHoraBR, ROTULO_STATUS } from '@/lib/format';
import type { Pagina, Pedido } from '@/lib/types';

interface Linha {
  numero: string;
  cliente: string;
  email: string;
  status: string;
  tipoEntrega: string;
  total: number;
  quantidadeItens: number;
  criadoEm: string;
  proximosStatus: string[];
}

interface Detalhe extends Pedido {
  cliente: {
    nome: string;
    email: string;
    telefone: string | null;
  };
  proximosStatus: string[];
}

function Lista() {
  const qc = useQueryClient();

  const [status, setStatus] = useState(useSearchParams().get('status') ?? '');
  const [q, setQ] = useState('');
  const [pagina, setPagina] = useState(1);
  const [aberto, setAberto] = useState<string | null>(null);

  const lista = useQuery({
    queryKey: ['admin-pedidos', status, q, pagina],
    queryFn: () =>
      api<Pagina<Linha>>(
        `/admin/pedidos?pagina=${pagina}${status ? `&status=${status}` : ''}${q ? `&q=${encodeURIComponent(q)}` : ''}`
      ),
  });

  return (
    <div className="space-y-5">
      <h1 className="text-3xl">Pedidos</h1>

      <div className="flex flex-wrap items-center gap-2">
        {[
          '',
          'AGUARDANDO_PAGAMENTO',
          'PAGO',
          'EM_SEPARACAO',
          'ENVIADO',
          'PRONTO_RETIRADA',
          'CONCLUIDO',
          'CANCELADO',
        ].map((s) => (
          <button
            key={s}
            onClick={() => {
              setStatus(s);
              setPagina(1);
            }}
            aria-pressed={status === s}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
              status === s
                ? 'bg-roxo-700 text-white'
                : 'bg-roxo-100 text-roxo-700'
            }`}
          >
            {s ? ROTULO_STATUS[s] : 'Todos'}
          </button>
        ))}
      </div>

      <Input
        placeholder="Buscar por número, nome ou e-mail"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setPagina(1);
        }}
        aria-label="Buscar pedidos"
        className="max-w-md"
      />

      {lista.isLoading && <Carregando />}

      {lista.data && (
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-roxo-50 text-xs uppercase text-roxo-700">
              <tr>
                <th className="p-3">Pedido</th>
                <th className="p-3">Cliente</th>
                <th className="p-3">Data</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Total</th>
                <th className="p-3" />
              </tr>
            </thead>

            <tbody className="divide-y divide-tinta-100">
              {lista.data.itens.map((p) => (
                <tr key={p.numero} className="hover:bg-roxo-50/50">
                  <td className="p-3 font-bold">{p.numero}</td>

                  <td className="p-3">
                    {p.cliente}
                    <span className="block text-xs text-tinta-600">
                      {p.email}
                    </span>
                  </td>

                  <td className="p-3">{dataHoraBR(p.criadoEm)}</td>

                  <td className="p-3">
                    <Selo cor={COR_STATUS[p.status]}>
                      {ROTULO_STATUS[p.status]}
                    </Selo>
                  </td>

                  <td className="p-3 text-right font-semibold">
                    {brl(p.total)}
                  </td>

                  <td className="p-3 text-right">
                    <Button
                      variante="contorno"
                      className="!px-3 !py-1.5 text-sm"
                      onClick={() => setAberto(p.numero)}
                    >
                      Abrir
                    </Button>
                  </td>
                </tr>
              ))}

              {lista.data.itens.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="p-6 text-center text-tinta-600"
                  >
                    Nenhum pedido encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {lista.data && lista.data.totalPaginas > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variante="contorno"
            disabled={pagina <= 1}
            onClick={() => setPagina((p) => p - 1)}
            className="!py-2"
          >
            ‹
          </Button>

          <span className="text-sm">
            Página {pagina} de {lista.data.totalPaginas}
          </span>

          <Button
            variante="contorno"
            disabled={pagina >= lista.data.totalPaginas}
            onClick={() => setPagina((p) => p + 1)}
            className="!py-2"
          >
            ›
          </Button>
        </div>
      )}

      {aberto && (
        <DetalhePedido
          numero={aberto}
          fechar={() => setAberto(null)}
          aoMudar={() =>
            qc.invalidateQueries({ queryKey: ['admin-pedidos'] })
          }
        />
      )}
    </div>
  );
}

function DetalhePedido({
  numero,
  fechar,
  aoMudar,
}: {
  numero: string;
  fechar: () => void;
  aoMudar: () => void;
}) {
  const q = useQuery({
    queryKey: ['admin-pedido', numero],
    queryFn: () => api<Detalhe>(`/admin/pedidos/${numero}`),
  });

  const [transportadora, setTransportadora] = useState('');
  const [codigo, setCodigo] = useState('');
  const [previsao, setPrevisao] = useState('');
  const [erro, setErro] = useState('');

  const mudar = useMutation({
    mutationFn: (status: string) =>
      api<Detalhe>(`/admin/pedidos/${numero}/status`, {
        method: 'PATCH',
        body: {
          status,
          ...(status === 'ENVIADO'
            ? {
                transportadora: transportadora || undefined,
                codigoRastreio: codigo || undefined,
                dataPrevista: previsao || undefined,
              }
            : {}),
        },
      }),

    onSuccess: (d) => {
      q.refetch();
      aoMudar();
      setErro('');
      return d;
    },

    onError: (e) =>
      setErro(e instanceof ApiError ? e.message : 'Erro ao atualizar.'),
  });

  const p = q.data;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Pedido ${numero}`}
    >
      <div className="card my-8 w-full max-w-2xl space-y-4 p-6">
        <div className="flex items-start justify-between">
          <h2 className="text-2xl">Pedido {numero}</h2>

          <button
            onClick={fechar}
            aria-label="Fechar"
            className="text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {!p ? (
          <Carregando />
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <Selo cor={COR_STATUS[p.status]}>
                {ROTULO_STATUS[p.status]}
              </Selo>

              <span className="text-sm text-tinta-600">
                {dataHoraBR(p.criadoEm)} ·{' '}
                {p.tipoEntrega === 'ENVIO'
                  ? 'Entrega'
                  : 'Retirada na loja'}
              </span>
            </div>

            <div className="text-sm">
              <p>
                <strong>{p.cliente.nome}</strong> · {p.cliente.email}
              </p>

              <p>
                Telefone: {p.cliente.telefone ?? 'Não informado'}
              </p>

              {p.endereco && (
                <p>
                  {p.endereco.logradouro}, {p.endereco.numero}
                  {p.endereco.complemento
                    ? ` – ${p.endereco.complemento}`
                    : ''}
                  {' – '}
                  {p.endereco.bairro}, {p.endereco.cidade}/{p.endereco.uf}
                  {' · CEP '}
                  {p.endereco.cep}
                </p>
              )}
            </div>

            <ul className="divide-y divide-tinta-100 text-sm">
              {p.itens.map((i) => (
                <li
                  key={i.produtoId}
                  className="flex justify-between py-2"
                >
                  <span>
                    {i.quantidade}× {i.titulo}
                  </span>

                  <span>
                    {brl(i.quantidade * i.precoUnitario)}
                  </span>
                </li>
              ))}
            </ul>

            <p className="text-right text-sm">
              Frete: {brl(p.frete)} ·{' '}
              <strong className="text-lg">
                Total: {brl(p.total)}
              </strong>
            </p>

            {p.envio?.codigoRastreio && (
              <p className="text-sm">
                Rastreio: <strong>{p.envio.codigoRastreio}</strong>{' '}
                {p.envio.transportadora
                  ? `(${p.envio.transportadora})`
                  : ''}
              </p>
            )}

            {erro && <Aviso tipo="erro">{erro}</Aviso>}

            {p.proximosStatus.length > 0 && (
              <div className="space-y-3 border-t border-tinta-100 pt-4">
                <p className="text-sm font-semibold">
                  Atualizar status
                </p>

                {p.proximosStatus.includes('ENVIADO') && (
                  <div className="grid gap-2 sm:grid-cols-3">
                    <Input
                      placeholder="Transportadora"
                      value={transportadora}
                      onChange={(e) => setTransportadora(e.target.value)}
                      aria-label="Transportadora"
                    />

                    <Input
                      placeholder="Código de rastreio"
                      value={codigo}
                      onChange={(e) => setCodigo(e.target.value)}
                      aria-label="Código de rastreio"
                    />

                    <Input
                      type="date"
                      value={previsao}
                      onChange={(e) => setPrevisao(e.target.value)}
                      aria-label="Previsão de entrega"
                    />
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {p.proximosStatus.map((s) => (
                    <Button
                      key={s}
                      variante={s === 'CANCELADO' ? 'perigo' : 'primario'}
                      disabled={mudar.isPending}
                      className="!py-2 text-sm"
                      onClick={() => {
                        if (
                          s !== 'CANCELADO' ||
                          confirm(
                            'Cancelar este pedido? O estoque reservado será devolvido.'
                          )
                        ) {
                          mudar.mutate(s);
                        }
                      }}
                    >
                      {s === 'CANCELADO'
                        ? 'Cancelar pedido'
                        : `Marcar como “${ROTULO_STATUS[s]}”`}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function AdminPedidos() {
  return (
    <Suspense>
      <Lista />
    </Suspense>
  );
}
