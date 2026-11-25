// Copia os schemas Zod do back-end (fonte única) para o front-end.
import { cpSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const origem = resolve(raiz, 'backend/src/schemas');
const destino = resolve(raiz, 'frontend/src/lib/schemas');
mkdirSync(destino, { recursive: true });
for (const f of readdirSync(origem)) cpSync(resolve(origem, f), resolve(destino, f));
console.log('Schemas sincronizados:', readdirSync(destino).join(', '));
