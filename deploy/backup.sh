#!/usr/bin/env bash
# Daily Postgres backup. Reads DATABASE_URL from /opt/360dash/.env.
# Cron: 0 3 * * *  /opt/360dash/backup.sh

set -euo pipefail

APP_DIR=${APP_DIR:-/opt/360dash}
BACKUP_DIR="$APP_DIR/backups"
ENV_FILE="$APP_DIR/.env"

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

mkdir -p "$BACKUP_DIR"
DATE=$(date +%Y%m%d-%H%M%S)
OUT="$BACKUP_DIR/dash360-$DATE.sql.gz"

# pg_dump can read postgresql:// (or our prefixed postgresql+psycopg://) URLs;
# strip the driver prefix so libpq-based pg_dump understands it.
PG_URL="${DATABASE_URL/postgresql+psycopg:\/\//postgresql://}"

pg_dump "$PG_URL" | gzip > "$OUT"

# 14-day retention
find "$BACKUP_DIR" -name 'dash360-*.sql.gz' -mtime +14 -delete

echo "[$(date)] backup ok: $OUT ($(du -h "$OUT" | cut -f1))"
