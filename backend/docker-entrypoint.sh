#!/bin/sh
set -e

echo "[entrypoint] Aplicando migrações"
npx sequelize-cli db:migrate

if [ "$SEED_DEMO_DATA" = "true" ]; then
  echo "[entrypoint] Carregando dados de demonstração (idempotente)"
  node dist/seeders/seed.js
fi

exec node dist/server.js
