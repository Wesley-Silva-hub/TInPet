#!/bin/sh
# Backup diário do Postgres (roda no serviço "backup" do docker-compose.prod.yml).
# Senha via PGPASSWORD (definida a partir de POSTGRES_PASSWORD no .env.prod).
set -eu

export PGPASSWORD="${POSTGRES_PASSWORD:?defina POSTGRES_PASSWORD}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"

while true; do
  file="/backups/tinpet-$(date +%Y%m%d-%H%M%S).dump"
  if pg_dump --format=custom --no-owner --file="$file.partial"; then
    mv "$file.partial" "$file"
    echo "backup ok: $file"
  else
    rm -f "$file.partial"
    echo "backup FALHOU" >&2
  fi
  find /backups -name 'tinpet-*.dump' -mtime +"$RETENTION_DAYS" -delete
  sleep 86400
done
