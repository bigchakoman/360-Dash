#!/usr/bin/env bash
# 360-Dash — Hetzner VPS provisioner
# Runs as root on a fresh Ubuntu 22.04/24.04 box.
# Idempotent-ish: safe to re-run for missing pieces, but assumes clean install.
#
# Usage:
#   sudo APP_DOMAIN=dash.360eventsaruba.com bash deploy/install.sh
#
# Env vars (with defaults):
#   APP_DOMAIN     — required, the public hostname Caddy serves
#   APP_DIR        — /opt/360dash
#   APP_USER       — dash360 (Linux user that runs uvicorn + owns the DB user)
#   DB_NAME        — dash360
#   DB_USER        — dash360
#   REPO_URL       — https://github.com/bigchakoman/360-Dash.git
#   ADMIN_EMAIL    — admin@360eventsaruba.com
#   PORT           — 8000 (uvicorn bind, internal only)

set -euo pipefail

: "${APP_DOMAIN:?APP_DOMAIN env var is required (e.g. dash.360eventsaruba.com)}"
APP_DIR=${APP_DIR:-/opt/360dash}
APP_USER=${APP_USER:-dash360}
DB_NAME=${DB_NAME:-dash360}
DB_USER=${DB_USER:-dash360}
REPO_URL=${REPO_URL:-https://github.com/bigchakoman/360-Dash.git}
ADMIN_EMAIL=${ADMIN_EMAIL:-admin@360eventsaruba.com}
PORT=${PORT:-8000}

echo ">>> 1/9  apt update + install system packages"
export DEBIAN_FRONTEND=noninteractive
apt update
apt install -y python3 python3-venv python3-pip postgresql git curl debian-keyring debian-archive-keyring apt-transport-https

# Caddy (official repo)
if ! command -v caddy >/dev/null 2>&1; then
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
  apt update
  apt install -y caddy
fi

# Node 20 (for vite build)
if ! command -v node >/dev/null 2>&1 || [[ "$(node -v)" != v20* ]]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt install -y nodejs
fi

echo ">>> 2/9  Linux user + app dir"
id -u "$APP_USER" >/dev/null 2>&1 || useradd --system --create-home --shell /bin/bash "$APP_USER"
mkdir -p "$APP_DIR" "$APP_DIR/backups"
chown -R "$APP_USER":"$APP_USER" "$APP_DIR"

echo ">>> 3/9  Postgres user + DB"
DB_PASS_FILE="$APP_DIR/.dbpass"
if [[ ! -s "$DB_PASS_FILE" ]]; then
  DB_PASS=$(tr -dc 'A-Za-z0-9' </dev/urandom | head -c 24)
  echo "$DB_PASS" > "$DB_PASS_FILE"
  chmod 600 "$DB_PASS_FILE"
  chown "$APP_USER":"$APP_USER" "$DB_PASS_FILE"
else
  DB_PASS=$(cat "$DB_PASS_FILE")
fi
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"
# Always (re)set the password in case .dbpass was regenerated
sudo -u postgres psql -c "ALTER USER $DB_USER WITH PASSWORD '$DB_PASS';" >/dev/null

echo ">>> 4/9  Clone or update repo"
if [[ ! -d "$APP_DIR/repo/.git" ]]; then
  sudo -u "$APP_USER" git clone "$REPO_URL" "$APP_DIR/repo"
else
  sudo -u "$APP_USER" git -C "$APP_DIR/repo" fetch --all
  sudo -u "$APP_USER" git -C "$APP_DIR/repo" reset --hard origin/main
fi

echo ">>> 5/9  Generate .env if missing"
ENV_FILE="$APP_DIR/.env"
if [[ ! -s "$ENV_FILE" ]]; then
  JWT_SECRET=$(tr -dc 'A-Za-z0-9_-' </dev/urandom | head -c 64)
  ADMIN_PASSWORD=$(tr -dc 'A-Za-z0-9' </dev/urandom | head -c 16)
  cat > "$ENV_FILE" <<EOF
APP_NAME=360-Dash
DEBUG=false
DATABASE_URL=postgresql+psycopg://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME
CORS_ORIGINS=https://$APP_DOMAIN
JWT_SECRET=$JWT_SECRET
JWT_ALGORITHM=HS256
JWT_EXPIRE_HOURS=168
ADMIN_EMAIL=$ADMIN_EMAIL
ADMIN_PASSWORD=$ADMIN_PASSWORD
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
EOF
  chmod 600 "$ENV_FILE"
  chown "$APP_USER":"$APP_USER" "$ENV_FILE"
  echo
  echo "=========================================================="
  echo "  Generated initial admin credentials. Save these NOW:"
  echo "    Email:    $ADMIN_EMAIL"
  echo "    Password: $ADMIN_PASSWORD"
  echo "  (You will be forced to change this on first login.)"
  echo "=========================================================="
  echo
fi

echo ">>> 6/9  Backend venv + deps + migrations"
sudo -u "$APP_USER" bash -c "
  set -euo pipefail
  cd '$APP_DIR'
  if [[ ! -d .venv ]]; then python3 -m venv .venv; fi
  ./.venv/bin/pip install --upgrade pip wheel >/dev/null
  ./.venv/bin/pip install -r repo/backend/requirements.txt
  set -a; source '$ENV_FILE'; set +a
  cd repo/backend
  '$APP_DIR/.venv/bin/alembic' upgrade head
"

echo ">>> 7/9  Frontend build"
sudo -u "$APP_USER" bash -c "
  set -euo pipefail
  cd '$APP_DIR/repo/frontend'
  npm ci
  VITE_API_BASE=/api npm run build
"

echo ">>> 8/9  systemd service for backend"
cat > /etc/systemd/system/360dash-backend.service <<EOF
[Unit]
Description=360-Dash FastAPI backend
After=network.target postgresql.service

[Service]
User=$APP_USER
Group=$APP_USER
WorkingDirectory=$APP_DIR/repo/backend
EnvironmentFile=$APP_DIR/.env
ExecStart=$APP_DIR/.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port $PORT
Restart=on-failure
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable --now 360dash-backend

echo ">>> 9/9  Caddy reverse proxy + TLS"
# Append the site block only if it isn't already there
if ! grep -q "$APP_DOMAIN" /etc/caddy/Caddyfile 2>/dev/null; then
  cat >> /etc/caddy/Caddyfile <<EOF

$APP_DOMAIN {
    encode zstd gzip
    handle_path /api/* {
        reverse_proxy 127.0.0.1:$PORT
    }
    handle {
        root * $APP_DIR/repo/frontend/dist
        try_files {path} /index.html
        file_server
    }
}
EOF
fi
systemctl reload caddy

# Backup script + cron
install -m 0755 -o "$APP_USER" -g "$APP_USER" "$APP_DIR/repo/deploy/backup.sh" "$APP_DIR/backup.sh"
CRON_LINE="0 3 * * * $APP_DIR/backup.sh >> $APP_DIR/backup.log 2>&1"
( sudo -u "$APP_USER" crontab -l 2>/dev/null | grep -v "$APP_DIR/backup.sh" ; echo "$CRON_LINE" ) \
  | sudo -u "$APP_USER" crontab -

echo
echo ">>> DONE."
echo "    Health check : curl https://$APP_DOMAIN/api/health"
echo "    Backend logs : journalctl -u 360dash-backend -f"
echo "    Caddy logs   : journalctl -u caddy -f"
echo "    Update later : sudo bash $APP_DIR/repo/deploy/update.sh"
