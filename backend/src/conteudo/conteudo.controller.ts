import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { Public } from '../common/decorators';

@Public()
@Controller()
export class ConteudoController {
  constructor(private prisma: PrismaService) {}

  /** Banners ativos e dentro da vigência (carrossel da página inicial). */
  @Get('banners')
  async banners() {
    const agora = new Date();
    const b = await this.prisma.banner.findMany({
      where: { ativo: true, AND: [{ OR: [{ inicio: null }, { inicio: { lte: agora } }] }, { OR: [{ fim: null }, { fim: { gte: agora } }] }] },
      orderBy: [{ ordem: 'asc' }, { id: 'asc' }],
    });
    return b.map((x) => ({ id: x.id, titulo: x.titulo, subtitulo: x.subtitulo, imagem: x.imagem, link: x.link }));
  }

  @Get('paginas/:slug')
  async pagina(@Param('slug') slug: string) {
    const p = await this.prisma.pagina.findUnique({ where: { slug } });
    if (!p) throw new NotFoundException('Página não encontrada.');
    return { slug: p.slug, titulo: p.titulo, conteudo: p.conteudo, atualizadoEm: p.atualizadoEm };
  }

  @Get('health')
  async health() {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: 'ok' };
  }
}
