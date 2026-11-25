import { z } from 'zod';

export const emailSchema = z.string().trim().toLowerCase().email('E-mail inválido').max(190);
export const telefoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[\d\s().-]{10,20}$/, 'Telefone inválido');
export const cepSchema = z
  .string()
  .trim()
  .regex(/^\d{5}-?\d{3}$/, 'CEP inválido');
export const idSchema = z.coerce.number().int().positive();

export const enderecoSchema = z.object({
  cep: cepSchema,
  logradouro: z.string().trim().min(2).max(160),
  numero: z.string().trim().min(1).max(20),
  complemento: z.string().trim().max(80).optional().or(z.literal('')),
  bairro: z.string().trim().min(2).max(80),
  cidade: z.string().trim().min(2).max(80),
  uf: z.string().trim().length(2).toUpperCase(),
});
export type EnderecoInput = z.infer<typeof enderecoSchema>;

export const itemCarrinhoSchema = z.object({
  produtoId: idSchema,
  quantidade: z.number().int().min(1).max(20),
});
export const itensCarrinhoSchema = z.array(itemCarrinhoSchema).min(1, 'O carrinho está vazio').max(50);
