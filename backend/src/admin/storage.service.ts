import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Env } from '../config/env';

const MAX_BYTES = 2 * 1024 * 1024;

/** Detecta o tipo real pelo conteúdo (não confia no nome nem no Content-Type enviados). */
function tipoReal(b: Buffer): 'jpg' | 'png' | 'webp' | null {
  if (b.length > 12 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpg';
  if (b.length > 12 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (b.length > 12 && b.subarray(0, 4).toString('ascii') === 'RIFF' && b.subarray(8, 12).toString('ascii') === 'WEBP') return 'webp';
  return null;
}

/** Armazenamento local (desenvolvimento e VPS). Em produção, pode ser trocado por armazenamento compatível com S3. */
@Injectable()
export class StorageService {
  constructor(private cfg: ConfigService<Env, true>) {}

  async salvarImagem(arquivo?: Express.Multer.File): Promise<string> {
    if (!arquivo) throw new BadRequestException('Envie um arquivo de imagem.');
    if (arquivo.size > MAX_BYTES) throw new BadRequestException('A imagem deve ter no máximo 2 MB.');
    const ext = tipoReal(arquivo.buffer);
    if (!ext) throw new BadRequestException('Formato não permitido. Use JPG, PNG ou WebP.');
    const dir = resolve(this.cfg.get('UPLOAD_DIR'));
    await mkdir(dir, { recursive: true });
    const nome = `${randomUUID()}.${ext}`; // nome aleatório: ignora o nome original
    await writeFile(resolve(dir, nome), arquivo.buffer, { mode: 0o644 });
    return `/uploads/${nome}`;
  }
}
