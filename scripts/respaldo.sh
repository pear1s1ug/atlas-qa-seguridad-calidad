#!/usr/bin/env bash
# NFR-SEG-7: respaldo de la base de datos y del storage de documentos, con verificación de integridad.
set -euo pipefail
cd "$(dirname "$0")/.."
DESTINO="${1:-respaldos}"
TS="$(date +%Y%m%d_%H%M%S)"
mkdir -p "$DESTINO"
docker exec atlas-postgres pg_dump -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-atlas}" -Fc > "$DESTINO/atlas_db_$TS.dump"
docker exec atlas-backend tar -czf - -C /app uploads > "$DESTINO/atlas_docs_$TS.tar.gz"
( cd "$DESTINO" && sha256sum "atlas_db_$TS.dump" "atlas_docs_$TS.tar.gz" > "atlas_$TS.sha256" )
# Retención: se conservan los 14 respaldos más recientes
ls -1t "$DESTINO"/atlas_db_*.dump 2>/dev/null | tail -n +15 | xargs -r rm -f
echo "Respaldo generado: $DESTINO/atlas_db_$TS.dump, $DESTINO/atlas_docs_$TS.tar.gz"
