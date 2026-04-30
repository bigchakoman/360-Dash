# Deploying 360-Dash via Coolify

Coolify is a self-hosted Heroku/Railway clone running on the Hetzner VPS. It
handles builds, deploys, SSL, Postgres, and logs through a web UI. The repo
ships Dockerfiles for both `backend/` and `frontend/`; Coolify reads them
directly from GitHub and rolls a new container on every `git push origin main`.

---

## Prerequisites

1. A Hetzner VPS (Ubuntu 22.04 or 24.04) with SSH as `root`.
2. SSH key set up at server creation. Example:
   `ssh -i C:\Users\Jared\.ssh\hetzner_2025 root@178.156.223.69`
3. Ports **22, 80, 443, 8000** open (`ufw allow 22,80,443,8000/tcp` if ufw is on).
4. (Optional) A subdomain A-record pointed at the VPS — needed for Let's Encrypt
   SSL. Without one, Coolify exposes services on `<service>.<vpsip>.sslip.io`
   over HTTP, which is fine for testing.

---

## A. Install Coolify (one-time, ~5 min)

```bash
ssh -i <ssh-key-path> root@<VPS_IP>
curl -fsSL https://cdn.coolify.io/coolify/install.sh | sudo bash
```

After it finishes, browse to `http://<VPS_IP>:8000` and create the admin
account through the web UI. Everything else is point-and-click from here.

---

## B. Provision Postgres + 360-Dash in Coolify

### 1. Add Postgres
Resources → New Resource → Postgres → Deploy.
Coolify generates a connection string — copy it; you'll need it for the backend.

### 2. Add backend application
- New Application → Public Git → `https://github.com/bigchakoman/360-Dash`
- Branch: `main`. Build pack: **Dockerfile**. Base directory: `/backend`.
- Environment variables:
  - `DATABASE_URL` — the Postgres connection string from step 1
  - `JWT_SECRET` — random string ≥32 chars
  - `ADMIN_EMAIL` — e.g. `admin@360eventsaruba.com`
  - `ADMIN_PASSWORD` — one-time seed password (forced-changed on first login)
  - `CORS_ORIGINS` — the frontend URL Coolify assigns in step 3
  - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` — fill in
    once you've updated the Google OAuth callback URL to match the deployed
    backend
- Deploy. The container runs `alembic upgrade head` on start, then uvicorn.

### 3. Add frontend application
- New Application → same repo, base directory `/frontend`, Dockerfile build pack.
- Build arg: `VITE_API_BASE` — the backend URL from step 2 (or `/api` if you
  set up a reverse-proxy domain serving both).
- Deploy.

When ready, point a real domain at the VPS and Coolify auto-issues a Let's
Encrypt cert via its built-in Traefik proxy.

---

## C. Updating after the initial deploy

```bash
git push origin main
```

Coolify webhook fires, rebuild kicks off, container rolls with zero downtime.
No SSH needed for app updates.

---

## Operational checks

Everything lives in the Coolify dashboard:
- **Logs** — per-app live tail (replaces `journalctl`)
- **Restart / redeploy** — single button
- **Env vars** — edit live, restart applies
- **Postgres** — connect via the built-in DB browser, or copy the connection
  string into `psql`/DBeaver

API health check from your machine:
```bash
curl https://<backend-url>/health
```

---

## Resetting the admin password

See `RESET_PASSWORD.md`. The script is the same — connect to the
Coolify-managed Postgres (Coolify exposes the connection string in the
Postgres resource panel) and run the snippet.

---

## Coexistence with n8n

Coolify can host n8n on the same VPS — Resources → New Resource → n8n
template → Deploy. It gets its own subdomain and isolated data volume,
fully separate from 360-Dash.
