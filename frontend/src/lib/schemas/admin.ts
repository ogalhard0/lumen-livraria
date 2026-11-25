import { z } from 'zod';
import { idSchema } from './comum';

export const produtoAdminSchema = z.object({
  categoriaId: idSchema,
  titulo: z.string().trim().min(2).max(200),
  autor: z.string().trim().min(2).max(160),
  descricao: z.string().trim().min(10).max(5000),
  preco: z.coerce.number().positive().max(99999.99),
  imagem: z.string().trim().max(300).regex(/^\/uploads\/[a-f0-9-]+\.(jpg|png|webp)$/).optional().or(z.literal('')),
  formato: z.enum(['FISICO', 'DIGITAL']).default('FISICO'),
  idioma: z.string().trim().min(2).max(10).default('pt-BR'),
  ativo: z.boolean().default(true),
  destaque: z.boolean().default(false),
  estoqueMinimo: z.coerce.number().int().min(0).max(1000).default(3),
  pesoGramas: z.coerce.number().int().min(1).max(30000).default(400),
  alturaCm: z.coerce.number().int().min(1).max(100).default(3),
  larguraCm: z.coerce.number().int().min(1).max(100).default(16),
  comprimentoCm: z.coerce.number().int().min(1).max(100).default(23),
  estoqueInicial: z.coerce.number().int().min(0).max(100000).default(0),
});
export type ProdutoAdminInput = z.infer<typeof produtoAdminSchema>;
export const produtoAdminAtualizarSchema = produtoAdminSchema.omit({ estoqueInicial: true }).partial();

export const estoqueEntradaSchema = z.object({
  produtoId: idSchema,
  quantidade: z.coerce.number().int().min(1).max(100000),
  observacao: z.string().trim().max(200).optional(),
});
export const estoqueAjusteSchema = z.object({
  produtoId: idSchema,
  novoEstoque: z.coerce.number().int().min(0).max(100000),
  motivo: z.string().trim().min(3).max(200),
});

export const pedidoStatusSchema = z.object({
  status: z.enum(['PAGO', 'EM_SEPARACAO', 'ENVIADO', 'PRONTO_RETIRADA', 'CONCLUIDO', 'CANCELADO']),
  transportadora: z.string().trim().max(80).optional(),
  codigoRastreio: z.string().trim().max(60).optional(),
  dataPrevista: z.coerce.date().optional(),
});

export const pedidoListaQuerySchema = z.object({
  status: z.enum(['AGUARDANDO_PAGAMENTO', 'PAGO', 'EM_SEPARACAO', 'ENVIADO', 'PRONTO_RETIRADA', 'CONCLUIDO', 'CANCELADO']).optional(),
  q: z.string().trim().max(100).optional(),
  pagina: z.coerce.number().int().min(1).default(1),
  porPagina: z.coerce.number().int().min(1).max(50).default(15),
});

export const bannerSchema = z.object({
  titulo: z.string().trim().min(2).max(120),
  subtitulo: z.string().trim().max(200).optional().or(z.literal('')),
  imagem: z.string().trim().max(300).optional().or(z.literal('')),
  link: z.string().trim().max(300).regex(/^\/[^\s]*$/, 'Use um caminho interno, como /catalogo').optional().or(z.literal('')),
  ordem: z.coerce.number().int().min(0).max(100).default(0),
  ativo: z.boolean().default(true),
  inicio: z.coerce.date().optional().nullable(),
  fim: z.coerce.date().optional().nullable(),
});
export type BannerInput = z.infer<typeof bannerSchema>;

export const produtosAdminQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  categoriaId: z.coerce.number().int().positive().optional(),
  estoque: z.enum(['baixo', 'sem']).optional(),
  ativo: z.enum(['true', 'false']).optional(),
  pagina: z.coerce.number().int().min(1).default(1),
  porPagina: z.coerce.number().int().min(1).max(50).default(15),
});
export const clientesQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  pagina: z.coerce.number().int().min(1).default(1),
  porPagina: z.coerce.number().int().min(1).max(50).default(15),
});
