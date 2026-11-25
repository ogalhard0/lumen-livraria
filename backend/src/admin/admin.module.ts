import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { StorageService } from './storage.service';
import { PedidosModule } from '../pedidos/pedidos.module';
import { MailModule } from '../mail/mail.service';

@Module({ imports: [PedidosModule, MailModule], controllers: [AdminController], providers: [AdminService, StorageService] })
export class AdminModule {}
