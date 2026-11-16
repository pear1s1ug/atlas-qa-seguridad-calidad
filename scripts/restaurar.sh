#!/usr/bin/env bash
# NFR-SEG-7 / NFR-DIS-2: restauración verificada de un respaldo en una base de datos destino.
set -euo pipefail
cd "$(dirname "$0")/.."
DUMP="${1:?Uso: restaurar.sh <archivo.dump> [base_destino]}"
DB="${2:-atlas_restaurada}"
SUMS="$(dirname "$DUMP")/$(basename "$DUMP" | sed -E 's/atlas_db_(.*)\.dump/atlas_\1.sha256/')"
if [ -f "$SUMS" ]; then ( cd "$(dirname "$DUMP")" && grep "$(basename "$DUMP")" "$(basename "$SUMS")" | sha256sum -c - ); fi
docker exec atlas-postgres psql -U "${POSTGRES_USER:-postgres}" -c "DROP DATABASE IF EXISTS $DB" -c "CREATE DATABASE $DB"
docker exec -i atlas-postgres pg_restore -U "${POSTGRES_USER:-postgres}" -d "$DB" --no-owner < "$DUMP"
docker exec atlas-postgres psql -U "${POSTGRES_USER:-postgres}" -d "$DB" -t -c \
  "SELECT 'usuarios='||count(*) FROM usuarios UNION ALL SELECT 'clientes='||count(*) FROM clientes UNION ALL SELECT 'contratos='||count(*) FROM contratos"
echo "Restauración completada en la base $DB"
