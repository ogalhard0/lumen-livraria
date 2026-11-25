import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { validarEnv, type Env } from './config/env';
import { PrismaModule } from './common/prisma.service';
import { AuditModule } from './common/audit.service';
import { JwtAuthGuard, RolesGuard } from './common/guards';
import { AuthModule } from './auth/auth.module';
import { CatalogoModule } from './catalogo/catalogo.module';
import { CarrinhoModule } from './carrinho/carrinho.module';
import { FreteModule } from './frete/frete.module';
import { PedidosModule } from './pedidos/pedidos.module';
import { PagamentosModule } from './pagamentos/pagamentos.module';
import { AdminModule } from './admin/admin.module';
import { ConteudoModule } from './conteudo/conteudo.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validarEnv }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    ScheduleModule.forRoot(),
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (cfg: ConfigService<Env, true>) => ({ secret: cfg.get('JWT_SECRET'), signOptions: { expiresIn: '15m' } }),
    }),
    PrismaModule,
    AuditModule,
    AuthModule,
    CatalogoModule,
    CarrinhoModule,
    FreteModule,
    PedidosModule,
    PagamentosModule,
    AdminModule,
    ConteudoModule,
  ],
  providers: [
    // Ordem importa: limite de requisições -> autenticação (negar por padrão) -> perfis.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
