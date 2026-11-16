#!/usr/bin/env bash
# Genera un archivo .env local con secretos aleatorios (nunca se versiona; ver .gitignore).
set -euo pipefail
cd "$(dirname "$0")/.."
if [ -f .env ] && [ "${1:-}" != "--forzar" ]; then
  echo ".env ya existe (use --forzar para regenerarlo)"; exit 0
fi
rnd() { openssl rand -hex "$1"; }
cat > .env <<EOT
COMPOSE_PROJECT_NAME=atlas
PORT_POSTGRES=15432
PORT_BACKEND=4450
PORT_FRONTEND=3350
POSTGRES_USER=postgres
POSTGRES_PASSWORD=$(rnd 16)
POSTGRES_DB=atlas
JWT_SECRET=$(rnd 32)
DATA_ENCRYPTION_KEY=$(rnd 32)
EOT
chmod 600 .env
echo "Archivo .env generado con secretos aleatorios."
