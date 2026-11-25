import { z } from 'zod';

const bool = (padrao: boolean) =>
  z
    .string()
    .optional()
    .transform((v) => (v === undefined || v === '' ? padrao : v === 'true' || v === '1'));

const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().default(3001),
    APP_URL: z.string().url(),
    CORS_ORIGINS: z.string().default(''),
    SWAGGER_ENABLED: bool(false),
    DATABASE_URL: z.string().min(1),
    JWT_SECRET: z.string().min(32, 'JWT_SECRET deve ter pelo menos 32 caracteres'),
    LOJA_CEP: z.string().regex(/^\d{8}$/).default('12500000'),
    LOJA_EMAIL_CONTATO: z.string().email().default('contato@lumenlivraria.com.br'),
    PEDIDO_EXPIRA_MINUTOS: z.coerce.number().int().min(5).default(60),
    FRETE_GRATIS_ACIMA_CENTS: z
      .string()
      .optional()
      .transform((v) => (v ? Number(v) : undefined)),
    PAYMENT_PROVIDER: z.enum(['fake', 'mercadopago']).default('fake'),
    MP_ACCESS_TOKEN: z.string().optional(),
    MP_WEBHOOK_SECRET: z.string().optional(),
    MP_NOTIFICATION_URL: z.string().optional(),
    SHIPPING_PROVIDER: z.enum(['flat', 'melhorenvio']).default('flat'),
    MELHOR_ENVIO_TOKEN: z.string().optional(),
    MELHOR_ENVIO_URL: z.string().default('https://sandbox.melhorenvio.com.br'),
    MAIL_TRANSPORT: z.enum(['console', 'smtp']).default('console'),
    MAIL_FROM: z.string().default('Lumen Livraria <nao-responda@lumenlivraria.com.br>'),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().int().default(587),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    UPLOAD_DIR: z.string().default('./uploads'),
  })
  .superRefine((e, ctx) => {
    const erro = (msg: string) => ctx.addIssue({ code: z.ZodIssueCode.custom, message: msg });
    if (e.NODE_ENV === 'production' && e.PAYMENT_PROVIDER === 'fake') {
      erro('PAYMENT_PROVIDER=fake não é permitido em produção');
    }
    if (e.PAYMENT_PROVIDER === 'mercadopago' && (!e.MP_ACCESS_TOKEN || !e.MP_WEBHOOK_SECRET)) {
      erro('MP_ACCESS_TOKEN e MP_WEBHOOK_SECRET são obrigatórios com PAYMENT_PROVIDER=mercadopago');
    }
    if (e.SHIPPING_PROVIDER === 'melhorenvio' && !e.MELHOR_ENVIO_TOKEN) {
      erro('MELHOR_ENVIO_TOKEN é obrigatório com SHIPPING_PROVIDER=melhorenvio');
    }
    if (e.MAIL_TRANSPORT === 'smtp' && (!e.SMTP_HOST || !e.SMTP_USER || !e.SMTP_PASS)) {
      erro('SMTP_HOST, SMTP_USER e SMTP_PASS são obrigatórios com MAIL_TRANSPORT=smtp');
    }
  });

export type Env = z.infer<typeof schema>;

export function validarEnv(config: Record<string, unknown>): Env {
  const r = schema.safeParse(config);
  if (!r.success) {
    const msg = r.error.issues.map((i) => `${i.path.join('.') || 'env'}: ${i.message}`).join('\n  ');
    throw new Error(`Configuração inválida:\n  ${msg}`);
  }
  return r.data;
}
