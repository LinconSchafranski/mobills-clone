#!/bin/sh
set -e

echo "Aplicando migrations do Prisma em $DATABASE_URL..."
(cd /app/migrate && node_modules/.bin/prisma migrate deploy --config prisma7.config.ts)

echo "Migrations aplicadas. Iniciando o servidor..."
exec "$@"
