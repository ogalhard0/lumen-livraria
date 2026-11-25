import { z } from 'zod';
import { cepSchema, enderecoSchema, idSchema, itensCarrinhoSchema, telefoneSchema } from './comum';

export const produtoQuerySchema = z.object({
  categoria: z.string().trim().max(80).optional(),
  q: z.string().trim().max(100).optional(),
  precoMin: z.coerce.number().min(0).optional(),
  precoMax: z.coerce.number().min(0).optional(),
  formato: z.enum(['FISICO', 'DIGITAL']).optional(),
  idioma: z.string().trim().max(10).optional(),
  disponibilidade: z.enum(['em_estoque', 'esgotado']).optional(),
  destaque: z.enum(['true', 'false']).optional(),
  ordem: z.enum(['recentes', 'preco_asc', 'preco_desc', 'titulo']).default('recentes'),
  pagina: z.coerce.number().int().min(1).default(1),
  porPagina: z.coerce.number().int().min(1).max(48).default(12),
});
export type ProdutoQuery = z.infer<typeof produtoQuerySchema>;

export const carrinhoValidarSchema = z.object({ itens: itensCarrinhoSchema });
export const carrinhoSalvarSchema = z.object({ itens: z.array(z.object({ produtoId: idSchema, quantidade: z.number().int().min(1).max(20) })).max(50) });

export const freteSchema = z.object({ cep: cepSchema, itens: itensCarrinhoSchema });

export const pedidoCriarSchema = z
  .object({
    itens: itensCarrinhoSchema,
    tipoEntrega: z.enum(['ENVIO', 'RETIRADA']),
    telefone: telefoneSchema,
    endereco: enderecoSchema.optional(),
    servicoFrete: z.string().trim().max(40).optional(),
  })
  .superRefine((d, ctx) => {
    if (d.tipoEntrega === 'ENVIO') {
      if (!d.endereco) ctx.addIssue({ code: 'custom', path: ['endereco'], message: 'Informe o endereço de entrega' });
      if (!d.servicoFrete) ctx.addIssue({ code: 'custom', path: ['servicoFrete'], message: 'Escolha uma opção de frete' });
    }
  });
export type PedidoCriarInput = z.infer<typeof pedidoCriarSchema>;

export const pagamentoPixSchema = z.object({ numeroPedido: z.string().regex(/^LUM-\d{6,}$/) });
export const pagamentoCartaoSchema = z.object({
  numeroPedido: z.string().regex(/^LUM-\d{6,}$/),
  token: z.string().min(5).max(200),
  paymentMethodId: z.string().min(2).max(40),
  issuerId: z.string().max(20).optional(),
  parcelas: z.number().int().min(1).max(12).default(1),
  documento: z.string().regex(/^\d{11}$|^\d{14}$/, 'CPF ou CNPJ inválido').optional(),
});
