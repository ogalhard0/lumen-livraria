import { z } from 'zod';
import { emailSchema, telefoneSchema } from './comum';

export const cadastroSchema = z.object({
  nome: z.string().trim().min(2, 'Informe o nome completo').max(120),
  email: emailSchema,
  senha: z.string().min(8, 'Mínimo de 8 caracteres').max(128),
  telefone: telefoneSchema.optional().or(z.literal('')),
  aceiteTermos: z.literal(true, { errorMap: () => ({ message: 'É necessário aceitar os termos e a política de privacidade' }) }),
  aceiteMarketing: z.boolean().default(false),
});
export type CadastroInput = z.infer<typeof cadastroSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  senha: z.string().min(1, 'Informe a senha').max(128),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const recuperarSenhaSchema = z.object({ email: emailSchema });
export const redefinirSenhaSchema = z.object({
  token: z.string().min(20).max(200),
  senha: z.string().min(8, 'Mínimo de 8 caracteres').max(128),
});
