#!/bin/sh
set -e
# Aplica as migrações versionadas; sem pasta de migrações (primeiro uso), sincroniza o esquema.
if [ -d prisma/migrations ] && [ "$(ls -A prisma/migrations 2>/dev/null)" ]; then
  npx prisma migrate deploy
else
  echo "Sem migrações versionadas: usando 'prisma db push' (apenas desenvolvimento/primeiro uso)."
  npx prisma db push --skip-generate
fi
exec node dist/main.js
