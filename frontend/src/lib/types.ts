export type Perfil = 'CLIENTE' | 'ATENDENTE' | 'ADMINISTRADOR';
export interface Usuario { id: number; nome: string; email: string; perfil: Perfil; telefone?: string | null }
export type Disponibilidade = 'EM_ESTOQUE' | 'ULTIMAS_UNIDADES' | 'ESGOTADO';
export interface Categoria { id: number; nome: string; slug: string; filhas: { id: number; nome: string; slug: string }[] }
export interface ProdutoCard {
  id: number; titulo: string; autor: string; slug: string; preco: number; imagem: string | null;
  formato: 'FISICO' | 'DIGITAL'; idioma: string; destaque: boolean;
  categoria: { id: number; nome: string; slug: string }; disponibilidade: Disponibilidade;
}
export interface ProdutoDetalhe extends ProdutoCard { descricao: string; relacionados: ProdutoCard[] }
export interface Pagina<T> { itens: T[]; total: number; pagina: number; porPagina: number; totalPaginas: number }
export interface Banner { id: number; titulo: string; subtitulo: string | null; imagem: string | null; link: string | null }
export interface LinhaCarrinho {
  produtoId: number; titulo: string; autor: string; slug: string; imagem: string | null;
  precoUnitario: number; quantidade: number; quantidadeDisponivel: number; disponivel: boolean; subtotal: number;
}
export interface CarrinhoValidado { linhas: LinhaCarrinho[]; subtotal: number; avisos: string[]; podeFinalizar: boolean }
export interface OpcaoFrete { codigo: string; nome: string; preco: number; prazoDias: number }
export type StatusPedido = 'AGUARDANDO_PAGAMENTO' | 'PAGO' | 'EM_SEPARACAO' | 'ENVIADO' | 'PRONTO_RETIRADA' | 'CONCLUIDO' | 'CANCELADO';
export interface Pedido {
  numero: string; status: StatusPedido; rotuloStatus: string; tipoEntrega: 'ENVIO' | 'RETIRADA';
  subtotal: number; frete: number; total: number; servicoFrete: string | null; prazoDias: number | null;
  criadoEm: string; expiraEm: string;
  itens: { produtoId: number; titulo: string; quantidade: number; precoUnitario: number }[];
  endereco: { cep: string; logradouro: string; numero: string; complemento: string | null; bairro: string; cidade: string; uf: string } | null;
  envio: { transportadora: string | null; codigoRastreio: string | null; dataPrevista: string | null } | null;
  pagamento: { id: number; metodo: 'PIX' | 'CARTAO'; status: string } | null;
  etapas: { codigo: StatusPedido; rotulo: string; concluida: boolean; atual: boolean }[];
}
export interface PagamentoResp { id: number; metodo: 'PIX' | 'CARTAO'; status: string; pixCopiaCola: string | null; pixQrBase64: string | null; expiraEm: string | null }
