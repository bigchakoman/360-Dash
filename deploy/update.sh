#!/usr/bin/env bash
# Pull the latest code, install deps, run migrations, rebuild frontend, restart backend.
# Usage: sudo bash /opt/360dash/repo/deploy/update.sh

set -euo pipefail

APP_DIR=${APP_DIR:-/opt/360dash}
APP_USER=${APP_USER:-dash360}

cd "$APP_DIR/repo"
sudo -u "$APP_USER" git fetch --all
sudo -u "$APP_USER" git reset --hard origin/main

sudo -u "$APP_USER" bash -c "
  set -euo pipefail
  cd '$APP_DIR'
  ./.venv/bin/pip install -r repo/backend/requirements.txt >/dev/null
  set -a; source '$APP_DIR/.env'; set +a
  cd repo/backend
  '$APP_DIR/.venv/bin/alembic' upgrade head
"

sudo -u "$APP_USER" bash -c "
  set -euo pipefail
  cd '$APP_DIR/repo/frontend'
  npm ci
  VITE_API_BASE=/api npm run build
"

systemctl restart 360dash-backend
echo "Updated. systemctl status 360dash-backend"
