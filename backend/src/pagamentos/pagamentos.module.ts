import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PagamentosController } from './pagamentos.controller';
import { PagamentosService } from './pagamentos.service';
import { FakePagamentoProvider, MercadoPagoProvider, PAGAMENTO_PROVIDER } from './pagamento.provider';
import { MailModule } from '../mail/mail.service';
import type { Env } from '../config/env';

@Module({
  imports: [MailModule],
  controllers: [PagamentosController],
  providers: [
    PagamentosService,
    {
      provide: PAGAMENTO_PROVIDER,
      inject: [ConfigService],
      useFactory: (cfg: ConfigService<Env, true>) =>
        cfg.get('PAYMENT_PROVIDER') === 'mercadopago'
          ? new MercadoPagoProvider(cfg.get('MP_ACCESS_TOKEN')!, cfg.get('MP_NOTIFICATION_URL'))
          : new FakePagamentoProvider(),
    },
  ],
})
export class PagamentosModule {}
