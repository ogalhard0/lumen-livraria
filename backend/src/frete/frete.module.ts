import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FreteController } from './frete.controller';
import { FreteService } from './frete.service';
import { FlatFreteProvider, FRETE_PROVIDER, MelhorEnvioProvider } from './frete.provider';
import type { Env } from '../config/env';

@Module({
  controllers: [FreteController],
  providers: [
    FreteService,
    {
      provide: FRETE_PROVIDER,
      inject: [ConfigService],
      useFactory: (cfg: ConfigService<Env, true>) =>
        cfg.get('SHIPPING_PROVIDER') === 'melhorenvio'
          ? new MelhorEnvioProvider(cfg.get('MELHOR_ENVIO_URL'), cfg.get('MELHOR_ENVIO_TOKEN')!, cfg.get('LOJA_CEP'), cfg.get('LOJA_EMAIL_CONTATO'))
          : new FlatFreteProvider(),
    },
  ],
  exports: [FreteService],
})
export class FreteModule {}
