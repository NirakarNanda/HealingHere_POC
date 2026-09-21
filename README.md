# Bijayalakshmi Physiotherapy

A complete, working, offline-first clinic POC for **Bijayalakshmi Physiotherapy**
— **Dr. Abhilash Nanda**. Designed primarily for an **iPad inside the clinic**,
with excellent desktop and mobile support.

Flow: **Beautiful landing page → Doctor login → Clinic dashboard → Patient
management → Offline records → MongoDB → Google Sheets sync.**

The core promise: **patient information is safe even when the internet isn't.**
Records save instantly to the device (IndexedDB), then synchronize
automatically — first to MongoDB via the backend API, then on to Google Sheets
via Google Apps Script.

---

## Architecture

```
                    ┌─────────────────────────────┐
                    │          FRONTEND           │
                    │  Next.js 14 + TypeScript    │
                    │  Tailwind + shadcn/ui       │
                    │  Dexie + IndexedDB (local   │
                    │   source of truth)          │
                    │  PWA · Dark/Light theme     │
                    └─────────────┬───────────────┘
                                  │  REST API (session cookie)
                                  ▼
                    ┌─────────────────────────────┐
                    │          BACKEND            │
                    │  Node.js + Express + TS     │
                    │  Mongoose · zod validation  │
                    │  HTTP-only session auth     │
                    └─────────────┬───────────────┘
                                  │
                         ┌────────┴────────┐
                         ▼                 ▼
                ┌────────────────┐   ┌────────────────┐
                │ Local MongoDB  │   │ Google Apps    │
                │ (persistent    │   │ Script (web    │
                │  database)     │   │ app)           │
                └────────────────┘   └───────┬────────┘
                                             ▼
                                      ┌──────────────┐
                                      │ Google Sheets│
                                      │ "Patients"   │
                                      └──────────────┘
```

Patient save flow (never waits for the network before confirming):

```
Patient Form → IndexedDB (syncStatus=PENDING) → UI updates instantly
      → Sync Queue → Backend API → MongoDB → Apps Script → Google Sheets
      → syncStatus=SYNCED (or FAILED — local data is never deleted)
```

`localId` (UUID) is the idempotency key at **every** layer: IndexedDB primary
key → MongoDB unique index + upsert → Apps Script lock + column-A scan. The
same `localId` always yields exactly one record everywhere.

## Tech stack

| Layer    | Technology |
|----------|------------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS 3, shadcn/ui (hand-built), Radix primitives, next-themes, Dexie.js 4 + dexie-react-hooks, Sonner toasts, lucide-react, PWA (manifest + service worker) |
| Backend  | Node.js, Express 5, TypeScript, Mongoose 9, express-session (HTTP-only cookie), CORS, zod validation, tsx |
| Sync     | Google Apps Script web app → Google Sheets |
| Database | MongoDB running locally |

What is **not** used: Firebase, Supabase, PostgreSQL, Prisma, MySQL, external
patient databases, external auth providers.

## Project structure

```
bijayalakshmi-physiotherapy/
├── frontend/                    # Next.js app (port 3000)
│   ├── app/
│   │   ├── page.tsx             # Landing page
│   │   ├── login/page.tsx       # Doctor login
│   │   ├── (app)/               # Authenticated shell (route guard)
│   │   │   ├── dashboard/page.tsx
│   │   │   └── patients/page.tsx
│   │   ├── layout.tsx           # Theme provider, PWA, anti-flash script
│   │   └── globals.css          # Single design system (light + dark tokens)
│   ├── components/
│   │   ├── ui/                  # shadcn/ui primitives
│   │   ├── landing/             # Hero, feature highlights
│   │   ├── auth/                # Login form
│   │   ├── dashboard/           # Header, stats, offline indicator
│   │   ├── patients/            # Form, list, search, details
│   │   └── sync/                # Sync status badge
│   ├── lib/
│   │   ├── db/                  # Dexie database + patient repository
│   │   ├── sync/                # Sync queue engine
│   │   └── api/                 # Backend API client (credentials: include)
│   ├── hooks/                   # use-online-status, use-patients, use-sync
│   ├── types/patient.ts         # Patient model + SyncStatus
│   ├── public/
│   │   ├── manifest.webmanifest # PWA manifest
│   │   ├── sw.js                # Offline service worker
│   │   └── icons/               # Generated PNG icons (192/512/maskable)
│   ├── scripts/generate-icons.mjs  # Zero-dependency icon generator
│   └── .env.example
├── backend/                     # Express API (port 5000)
│   └── src/
│       ├── server.ts            # App bootstrap
│       ├── config/              # env validation, Mongo connection
│       ├── models/              # Patient (unique index on localId)
│       ├── controllers/         # auth, patients, sync
│       ├── routes/              # /api/auth, /api/patients, /api/sync, /api/health
│       ├── middleware/          # requireAuth, zod validation, error handler
│       ├── services/            # appsScriptService (Sheets forwarding)
│       ├── validation/          # zod schemas
│       └── types/
├── google-apps-script/
│   ├── Code.gs                  # Sheets upsert endpoint (doGet/doPost)
│   └── README.md                # Sheet + deployment setup guide
├── .gitignore
└── README.md
```

---

## Prerequisites

- **Node.js 18+** (20+ recommended) and npm.
- **MongoDB running locally** — pick one:
  - Download & install from [mongodb.com](https://www.mongodb.com/try/download/community),
    then start `mongod` (default port 27017), or
  - Docker: `docker run -d -p 27017:27017 --name mongo mongo:7`
- A **Google account** (only needed for the Google Sheets hop).

Verify MongoDB is reachable:

```bash
mongosh --eval "db.runCommand({ ping: 1 })"
# -> { ok: 1 }
```

## Backend setup

```bash
cd backend
npm install
cp .env.example .env
npm run dev        # http://localhost:5000 (tsx watch)
```

`npm run build` compiles to `dist/`; `npm start` runs the compiled server.

### Backend environment variables

| Variable         | Required | Description |
|------------------|----------|-------------|
| `PORT`           | No       | API port. Default `5000`. |
| `NODE_ENV`       | No       | `development` or `production`. Default `development`. |
| `MONGODB_URI`    | No       | Mongo connection string. Default `mongodb://127.0.0.1:27017/bijayalakshmi_physiotherapy`. |
| `ADMIN_USERNAME` | **Yes**  | Doctor login username. |
| `ADMIN_PASSWORD` | **Yes**  | Doctor login password. |
| `SESSION_SECRET` | **Yes**  | Long random string for session signing. The server **refuses to start in production** with the placeholder value. |
| `APPS_SCRIPT_URL`| No       | Deployed Apps Script web-app URL (`…/exec`). Empty = Sheets step skipped (dev mode); MongoDB persistence still works. |
| `FRONTEND_URL`   | No       | Allowed CORS origin(s), comma-separated. Default `http://localhost:3000`. |

Generate a session secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Auth uses an **HTTP-only session cookie** (`bp.sid`, SameSite=Lax, 12-hour
expiry, `Secure` in production). The browser JavaScript can never read it.

## Frontend setup

```bash
cd frontend
npm install
cp .env.example .env     # NEXT_PUBLIC_API_URL=http://localhost:5000/api
npm run dev              # http://localhost:3000
```

Other scripts: `npm run build` (production build), `npm start` (serve it),
`npm run typecheck`, `npm run generate-icons` (regenerate PWA icons).

> The frontend never contains credentials, MongoDB URIs, or Apps Script
> secrets. Login is a session-cookie exchange with the backend.

## Default doctor login

```
Username: DRAbhilash
Password: Ved@123
```

> ⚠️ **POC credential — change before any production use.** Set new values for
> `ADMIN_USERNAME` / `ADMIN_PASSWORD` in `backend/.env` and restart the
> backend. There is no signup or patient login; this is the only account.

Failed logins return `Invalid username or password` and never reveal which
field was wrong.

## Google Apps Script + Google Sheets setup

Full step-by-step guide: [`google-apps-script/README.md`](./google-apps-script/README.md).

Short version:

1. Create a Google Sheet; copy its spreadsheet ID from the URL.
2. **Extensions → Apps Script**, paste [`Code.gs`](./google-apps-script/Code.gs),
   set `SPREADSHEET_ID` at the top, save.
3. **Deploy → New deployment → Web app** — Execute as: **Me**, Who has access:
   **Anyone** → Deploy → authorize → copy the `/exec` URL.
4. Put it in `backend/.env` as `APPS_SCRIPT_URL=…` and restart the backend.
5. Test: `curl -sL "<web app url>"` → `{"success":true,"service":"Bijayalakshmi Physiotherapy Sync"}`.

The script auto-creates the **Patients** tab with this header row on first
write: `localId, patientName, dateOfBirth, phone, gender, problem, injuryHistory,
notes, createdAt, updatedAt, syncedAt`.

> After editing `Code.gs`, always **Deploy → Manage deployments → New version**,
> or the live URL keeps running the old code.

## Running locally

Terminal 1 — backend:

```bash
cd backend && npm run dev
```

Terminal 2 — frontend:

```bash
cd frontend && npm run dev
```

Open **http://localhost:3000** → landing page → **Doctor Login** → dashboard.

Sanity checks:

```bash
curl -s http://localhost:5000/api/health
# {"success":true,"status":"ok","service":"Bijayalakshmi Physiotherapy API","mongodb":"connected",...}

curl -s -X POST http://localhost:5000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"DRAbhilash","password":"Ved@123"}' -c /tmp/cookie
# {"success":true,"user":{"username":"DRAbhilash","name":"Dr. Abhilash Nanda"}}
```

## API reference

All `/api/*` routes except `/api/health` and `POST /api/auth/login` require the
session cookie.

| Method | Route                 | Description |
|--------|-----------------------|-------------|
| GET    | `/api/health`         | Service + MongoDB status (no auth) |
| POST   | `/api/auth/login`     | `{username, password}` → sets `bp.sid` cookie |
| POST   | `/api/auth/logout`    | Destroys session |
| GET    | `/api/auth/me`        | Current session user (or 401) |
| GET    | `/api/patients`       | List patients, newest first |
| GET    | `/api/patients/:id`   | One patient (Mongo `_id` or `localId`) |
| POST   | `/api/patients`       | Create patient |
| PUT    | `/api/patients/:id`   | Update patient |
| POST   | `/api/sync`           | `{patients:[...]}` → per-patient `{localId, status: SYNCED\|FAILED, serverId?, error?}` |

`POST /api/sync` upserts each patient into MongoDB by `localId`, then forwards
it to the Apps Script. One patient's failure never blocks the rest of the
batch. If MongoDB is down the endpoint returns 503 and local data stays safe.

## Offline-first behavior

- **IndexedDB (Dexie) is the UI's source of truth.** Saving a patient writes
  locally first with `syncStatus: PENDING` — the UI confirms immediately and
  never waits for the network.
- **Sync triggers:** save while online, app start while online, browser
  `offline → online` transition, and the manual **Sync Now** button.
- **Concurrent syncs are prevented** by an in-flight lock; failed records keep
  `syncStatus: FAILED` locally and can be retried.
- **Search is fully local** (name/phone) and works offline.
- Records survive refresh and logout — IndexedDB persists per browser profile.

Status badges (icon + text, never color-only): `◷ Pending` · `↻ Syncing` ·
`✓ Synced` · `! Failed`.

## Testing

### Offline test (the critical path)

1. Log in while online → dashboard.
2. Turn Wi-Fi **OFF** (header shows "Offline — changes are safely stored on this device").
3. **Add Patient** → fill the form → Save. The patient appears immediately with `◷ Pending`.
4. Refresh the page — the patient is still there.
5. Search for the patient by name/phone — works offline.
6. Turn Wi-Fi **ON** — sync starts automatically.
7. Patient flips to `✓ Synced`. Verify in MongoDB and in the Google Sheet.

### Sync-failure test

1. Stop the backend (`Ctrl+C` in its terminal).
2. Add a patient (or press **Sync Now**) — records go to `! Failed`; toast:
   "Sync unsuccessful · Your local data is safe". Records remain visible.
3. Restart the backend → press **Sync Now** → records become `✓ Synced`.

### Duplicate test

Send the same patient twice with the same `localId`:

```bash
# login first, saving the cookie
curl -s -X POST http://localhost:5000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"DRAbhilash","password":"Ved@123"}' -c /tmp/cookie > /dev/null

PAYLOAD='{"patients":[{"localId":"11111111-2222-3333-4444-555555555555","patientName":"Dup Check","dateOfBirth":"1985-05-05","phone":"+919000000001","gender":"Male","problem":"Knee pain","injuryHistory":"","notes":"","createdAt":"2026-09-21T00:00:00.000Z","updatedAt":"2026-09-21T00:00:00.000Z"}]}'

curl -s -X POST http://localhost:5000/api/sync -b /tmp/cookie \
  -H 'Content-Type: application/json' -d "$PAYLOAD"
curl -s -X POST http://localhost:5000/api/sync -b /tmp/cookie \
  -H 'Content-Type: application/json' -d "$PAYLOAD"
```

Expected: **1 document** in MongoDB (`db.patients.countDocuments({localId: "11111111-…"})`)
and **1 row** in the Sheet — the second write returns `action: "updated"`.

### Theme checklist

- Toggle ☀/☾ on the landing page and in the app header; tooltip reads
  "Switch to dark mode" / "Switch to light mode".
- Visit landing, login, dashboard, patients, patient form, details sheet, and
  dialogs in **both** themes — no stuck light-only/dark-only surfaces.
- Refresh: theme persists. First visit: follows the OS preference. No flash of
  the wrong theme on load.
- `prefers-reduced-motion` disables the decorative animations.

## PWA installation

The app ships a web manifest, service worker (cached app shell, network-first
API), generated icons, and `viewport-fit=cover` safe-area support.

- **Desktop Chrome/Edge:** open the app → install icon in the address bar (or
  menu → "Install Bijayalakshmi Physiotherapy").
- **iPad Safari:** Share → **Add to Home Screen**. Launches standalone,
  full-screen, with the app icon.
- The cached shell lets the login/dashboard/patients pages open even with no
  connection; patient data itself lives in IndexedDB.

## iPad usage notes

- All touch targets are ≥ 44px; inputs are large with generous spacing.
- Nothing depends on hover — every action is tappable.
- Layouts are designed for **768px portrait** and **1024px landscape**, not just
  shrunk desktop: tables become cards on narrow screens.
- For daily clinic use, install via Add to Home Screen and keep the iPad's
  browser profile as the "device" — records persist across sessions.
- If the clinic iPad is shared, use **Logout** at shift end (session cookie is
  HTTP-only and cleared on logout).

## Production deployment notes

- Set `NODE_ENV=production` in `backend/.env`.
- `SESSION_SECRET` must be a long random string (the server refuses the
  placeholder in production); session cookies become `Secure`.
- `FRONTEND_URL` must be the real frontend origin (HTTPS). Keep frontend and
  backend on the **same site** (e.g. `app.example.com` + `api.example.com`) so
  the `SameSite=Lax` session cookie is sent.
- **Change `ADMIN_USERNAME` / `ADMIN_PASSWORD`.** Consider a real user store
  before production.
- MongoDB: point `MONGODB_URI` at a managed instance (e.g. MongoDB Atlas) —
  local `mongod` is a POC convenience, not a production plan. Keep backups.
- Build: `cd backend && npm run build && npm start`; `cd frontend && npm run build && npm start`
  (or deploy the frontend to any Node host / Vercel; set `NEXT_PUBLIC_API_URL`
  to the public API URL at build time).
- Apps Script: keep the deployment's **New version** flow in mind; restrict the
  sheet's sharing to clinic staff.

## Troubleshooting

| Symptom | Likely cause / fix |
|---------|--------------------|
| Backend logs Mongo connection errors; `/api/health` shows `"mongodb":"disconnected"` | `mongod` isn't running or `MONGODB_URI` is wrong. Sync returns 503; local data stays safe. |
| Login fails with correct credentials | `ADMIN_USERNAME`/`ADMIN_PASSWORD` in `backend/.env` don't match; backend needs a restart after `.env` changes. |
| Dashboard redirects to login immediately | Frontend `NEXT_PUBLIC_API_URL` doesn't match the backend origin, or `FRONTEND_URL` doesn't include the frontend origin (CORS/cookie blocked). |
| Sync succeeds but no Sheet rows | `APPS_SCRIPT_URL` empty (dev mode — intentional) or the deployment wasn't updated to a **New version** after editing code. |
| Apps Script returns an HTML login page | Redeploy the web app with **Who has access: Anyone**. |
| `curl` to the `/exec` URL shows `302` | Normal Google sandboxing — use `curl -sL` to follow the redirect. |
| Theme flashes on load | The anti-flash inline script in `app/layout.tsx` handles this; if customized layouts drop it, re-add. |
