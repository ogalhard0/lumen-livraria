import { Module } from '@nestjs/common';
import { ConteudoController } from './conteudo.controller';

@Module({ controllers: [ConteudoController] })
export class ConteudoModule {}
