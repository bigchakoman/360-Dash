# 360-Dash

> Operations dashboard for **360 Events Aruba** — manage events, assign crew, tag equipment, and auto-notify the team via WhatsApp.

*Every angle, every moment, every celebration.*

---

## What it does

- **Events** — calendar of upcoming and past bookings with client, location, time, status, and optional revenue.
- **Crew** — roster with E.164 WhatsApp numbers and roles.
- **Equipment** — flexible tag system. Cameras, backgrounds, lighting, glam — tag any combination per event.
- **Auto-WhatsApp** — assigning crew to an event sends a personalized WhatsApp message via Twilio with the event details. Delivery status is captured and a one-click resend is available if it fails.
- **Reports** — monthly + yearly summaries: event count, hours, revenue, top crew, top equipment, and a per-month bar chart.
- **Branded** — colors, fonts, voice from the 360 Events brand book (Brand Blue lead, Aruba Gold/Sunset Coral accents, Archivo + Fraunces).

---

## Stack

| Layer | Tech |
|---|---|
| Backend | FastAPI · SQLAlchemy 2 · Alembic · Pydantic v2 · Python 3.13 |
| Frontend | React 19 · TypeScript · Vite 7 · Tailwind v4 · Recharts · React Router 7 |
| WhatsApp | Twilio Python SDK |
| DB (dev) | SQLite |
| DB (prod) | Postgres (Railway / Render / Supabase) |

---

## Local setup

### 1. Backend

```bash
cd backend
py -3.13 -m venv .venv
.venv/Scripts/python -m pip install -r requirements.txt   # (Linux/Mac: source .venv/bin/activate && pip install -r requirements.txt)
cp .env.example .env
# edit .env: set ADMIN_PASSWORD, JWT_SECRET, and (later) Twilio creds
.venv/Scripts/python -m uvicorn app.main:app --reload
```

Backend runs at `http://127.0.0.1:8000`. Tables auto-create on first boot; the admin user is seeded from `.env`. Health check: `GET /health`. Interactive API docs: `http://127.0.0.1:8000/docs`.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173` and proxies `/api/*` to the backend.

Sign in with the admin email/password from `backend/.env`.

---

## WhatsApp setup (Twilio)

The dashboard works without WhatsApp configured — assignment will succeed and the failure reason ("Twilio credentials not configured") will appear in the Crew panel of the event.

**To enable real sending:**

1. Create a free Twilio account → grab `Account SID` and `Auth Token`.
2. Activate the WhatsApp **sandbox** (Twilio console → Messaging → Try it out → Send a WhatsApp message). Text the join code from your phone to `+1 415 523 8886`.
3. Fill `backend/.env`:
   ```
   TWILIO_ACCOUNT_SID=AC...
   TWILIO_AUTH_TOKEN=...
   TWILIO_WHATSAPP_FROM=whatsapp:+14155238886    # sandbox
   ```
4. Restart uvicorn.
5. In the dashboard, add yourself as a crew member (E.164: `+13055551234`), create an event, assign yourself. WhatsApp arrives in seconds.

**For production:** apply for an approved WhatsApp Business Sender (1–2 business days via Twilio + Meta verification), then replace `TWILIO_WHATSAPP_FROM` with your approved number. Sandbox messages go only to numbers that joined; an approved sender can message anyone.

The CLI tool `tools/send_whatsapp.py` wraps Twilio for ad-hoc sends and matches the WAT framework's deterministic-tools pattern.

---

## Project layout

```
360-Dash/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI bootstrap, lifespan = create tables + seed admin
│   │   ├── config.py            # pydantic-settings (env)
│   │   ├── db.py                # SQLAlchemy engine + session
│   │   ├── models.py            # admin_user, crew_member, equipment_tag, event, event_crew, event_equipment
│   │   ├── schemas.py           # pydantic request/response (E.164 phone validation)
│   │   ├── auth.py              # JWT + bcrypt + admin seed
│   │   ├── routers/             # auth, crew, equipment, events, summary
│   │   └── services/whatsapp.py # Twilio wrapper, send_assignment(crew, event)
│   ├── alembic/                 # migrations (run `alembic upgrade head` for prod)
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # routes + Protected wrapper
│   │   ├── index.css            # Tailwind v4 @theme — brand tokens (blue/gold/coral, Archivo+Fraunces)
│   │   ├── lib/
│   │   │   ├── api.ts           # typed fetch client + domain types
│   │   │   ├── auth.tsx         # JWT context, localStorage
│   │   │   ├── toast.tsx
│   │   │   └── format.ts
│   │   ├── components/          # Layout (sidebar), PageHeader, Modal, StatusPill
│   │   └── pages/               # Login, Dashboard, Events, EventDetail, Crew, Equipment, Reports
│   ├── vite.config.ts           # /api proxy → 127.0.0.1:8000, Tailwind v4 plugin
│   └── package.json
│
├── tools/
│   └── send_whatsapp.py         # CLI WhatsApp sender (WAT-style)
│
├── workflows/                   # WAT-pattern SOPs (empty for now)
├── brand-guidelines/            # PNG brand book (extracted from the zip)
└── .MD/CLAUDE.md                # WAT framework agent instructions
```

---

## Deploying

**Backend (Railway / Render):**
- Provision Postgres; set `DATABASE_URL=postgresql+psycopg://...`
- Set all `.env` values as service env vars (especially `JWT_SECRET`, `ADMIN_PASSWORD`, Twilio creds, `CORS_ORIGINS=https://your-frontend.vercel.app`)
- Build command: `pip install -r requirements.txt`
- Start command: `alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT`

**Frontend (Vercel):**
- Set `VITE_API_BASE` if you change the proxy approach (currently same-origin via Vite proxy in dev; in prod the frontend should be served behind a reverse proxy that forwards `/api/*` to the backend, OR change `frontend/src/lib/api.ts` to call the absolute backend URL and set CORS).
- Build command: `npm run build`
- Output directory: `dist`

---

## Brand

Pulled from the 360 Events Aruba brand book (`brand-guidelines/`):

- **Colors**: Brand Blue `#134896` (lead), Pure White, Aruba Gold `#E4B54A`, Sunset Coral `#E8593E`, Midnight Ink `#0A0F1C`.
- **Type**: Archivo (UI, headlines), Fraunces italic (editorial taglines, eyebrows).
- **Voice**: trusted host — warm, confident, never shouting. The WhatsApp template uses a friendly opener and closes with *"Masha danki!"* per the local-touch guideline.
- **Usage**: lead with Brand Blue; pair Gold OR Coral as the single accent per layout (never both); maintain clear space.

---

## Verification checklist

- [x] Backend: `uvicorn app.main:app` boots, `/health` returns `{"status":"ok"}`, `/auth/login` issues JWT, CRUD endpoints work, `/summary/month` aggregates.
- [x] WhatsApp graceful failure: assigning crew with no Twilio creds records `"notification_error": "Twilio credentials not configured"` instead of failing the assignment.
- [x] Frontend: `npm run build` succeeds, `npx tsc -b` clean.
- [ ] WhatsApp end-to-end: requires real Twilio sandbox credentials in `.env` — text join code, then assign yourself in the UI.

---

## What's not done yet

- Calendar (month-grid) view of events — list view ships first.
- Crew confirm/decline flow via WhatsApp inbound webhook (placeholder field `confirmation_status` exists).
- Multi-user / per-crew login portal — current design is single admin only.
