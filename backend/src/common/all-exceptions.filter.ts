import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Response } from 'express';

/** Formato único de erro, sem expor detalhes internos (Etapa 4, seção 7.1). */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Erro');

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    const req = host.switchToHttp().getRequest();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const corpo = exception.getResponse();
      const obj = typeof corpo === 'string' ? { mensagem: corpo } : (corpo as Record<string, unknown>);
      const mensagem = (obj.mensagem ?? obj.message ?? exception.message) as string | string[];
      res.status(status).json({
        statusCode: status,
        mensagem: Array.isArray(mensagem) ? mensagem.join('; ') : mensagem,
        ...(obj.erros ? { erros: obj.erros } : {}),
      });
      return;
    }

    this.logger.error(`${req.method} ${req.url}`, exception instanceof Error ? exception.stack : String(exception));
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: 500,
      mensagem: 'Ocorreu um erro inesperado. Tente novamente em instantes.',
    });
  }
}
