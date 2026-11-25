import { Module } from '@nestjs/common';
import { PedidosController } from './pedidos.controller';
import { PedidosService } from './pedidos.service';
import { FreteModule } from '../frete/frete.module';
import { MailModule } from '../mail/mail.service';

@Module({ imports: [FreteModule, MailModule], controllers: [PedidosController], providers: [PedidosService], exports: [PedidosService] })
export class PedidosModule {}
