# Deploying 360-Dash to a Hetzner VPS

Stack on the box: **Caddy** (HTTPS + reverse proxy + static files) → **uvicorn** (systemd) → **Postgres** (local). Daily `pg_dump` backups via cron. Designed to coexist peacefully with an existing n8n instance — uses port 8000 internally and whatever ports Caddy needs externally (80/443).

---

## Prerequisites (one-time, your side)

1. A Hetzner VPS running Ubuntu 22.04 or 24.04 with SSH access as `root` (or a sudo user).
2. A subdomain pointing at the VPS, e.g. `dash.360eventsaruba.com`. Add a DNS **A record** to your VPS public IP — Caddy will auto-issue a Let's Encrypt cert as soon as it sees a request to that hostname.
3. Ports **80** and **443** open on the firewall (`ufw allow 80,443/tcp` if ufw is on).

---

## Initial install (run on the VPS, once)

```bash
ssh root@<VPS_IP>
cd /tmp
curl -fsSL https://raw.githubusercontent.com/bigchakoman/360-Dash/main/deploy/install.sh -o install.sh
chmod +x install.sh
APP_DOMAIN=dash.360eventsaruba.com bash install.sh
```

The script will:

1. Install Python, Postgres, Caddy, Node 20, git.
2. Create a `dash360` Linux user and Postgres user/DB.
3. Clone the repo to `/opt/360dash/repo`.
4. Generate a strong `JWT_SECRET` and a random `ADMIN_PASSWORD`, write them to `/opt/360dash/.env`. **The script prints the password once — copy it immediately.**
5. Create the venv, install backend deps, run Alembic migrations.
6. Run `npm ci && npm run build` for the frontend.
7. Install + enable a `360dash-backend` systemd service.
8. Append a site block to `/etc/caddy/Caddyfile` and reload Caddy.
9. Install the daily `pg_dump` backup cron.

After it finishes, the dashboard is live at `https://dash.360eventsaruba.com`. First login uses the printed password and immediately forces a change.

---

## Updating (when you push new commits)

```bash
ssh root@<VPS_IP>
sudo bash /opt/360dash/repo/deploy/update.sh
```

This pulls main, reinstalls deps, runs migrations, rebuilds the frontend, restarts the backend. Frontend update is atomic from the user's view (Vite writes a new bundle, Caddy serves it on the next request).

---

## Configuring Twilio later

Edit `/opt/360dash/.env` — set `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN`. Then:

```bash
sudo systemctl restart 360dash-backend
```

For the Twilio sandbox, keep `TWILIO_WHATSAPP_FROM=whatsapp:+14155238886`. For an approved production sender, set it to `whatsapp:+<your_approved_number>`.

---

## Operational checks

```bash
# Live backend log
sudo journalctl -u 360dash-backend -f

# Caddy log (TLS issuance, request errors)
sudo journalctl -u caddy -f

# Service status
sudo systemctl status 360dash-backend caddy postgresql

# Quick API health
curl https://dash.360eventsaruba.com/api/health

# Manual DB backup
sudo -u dash360 /opt/360dash/backup.sh
ls -lh /opt/360dash/backups/
```

---

## Coexistence with n8n

This deploy doesn't touch n8n. Caddy on the VPS will need to handle both hostnames — if your existing n8n setup uses a different hostname (e.g. `n8n.example.com`), it should already have its own block in `/etc/caddy/Caddyfile`. The `install.sh` only **appends** the dashboard's block; it never modifies existing entries.

If your n8n uses a different reverse proxy (e.g. nginx or Caddy already managed differently), check `/etc/caddy/Caddyfile` after install to make sure both blocks are intact, and just `systemctl reload caddy` if you edit anything.

---

## Disaster recovery

```bash
# Restore from a backup
sudo -u dash360 bash -c '
  set -a; source /opt/360dash/.env; set +a
  PG_URL=${DATABASE_URL/postgresql+psycopg:\/\//postgresql://}
  gunzip -c /opt/360dash/backups/dash360-YYYYMMDD-HHMMSS.sql.gz | psql "$PG_URL"
'
```

For real disaster recovery (whole VPS gone), you'll want offsite backups too. Cheapest option: rsync `/opt/360dash/backups/` to a Hetzner Storage Box (~€4/mo, 100 GB) via cron once a day.
