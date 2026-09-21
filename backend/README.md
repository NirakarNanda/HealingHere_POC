# Bijayalakshmi Physiotherapy — Backend

Express + TypeScript + Mongoose API for the Bijayalakshmi Physiotherapy
offline-first POC. Persists synced patient records to local MongoDB and
forwards them to Google Sheets through a Google Apps Script web app.

## Prerequisites

- Node.js 18+
- Local MongoDB (`mongod`) listening on `127.0.0.1:27017`
  (e.g. `mongod --dbpath ~/data/db`)

## Setup

```bash
npm install
cp .env.example .env
# edit .env: at minimum set a real SESSION_SECRET
npm run dev
```

The API listens on `PORT` (default 5000). `GET /api/health` answers even
when MongoDB is unreachable; database-dependent routes return `503`
until the connection is established.

## Scripts

| Command      | Description                          |
| ------------ | ------------------------------------ |
| `npm run dev`   | Start with hot reload (`tsx watch`) |
| `npm run build` | Compile TypeScript to `dist/`       |
| `npm start`     | Run the compiled server             |

## Routes

```
POST /api/auth/login     { username, password } → sets bp.sid httpOnly cookie
POST /api/auth/logout
GET  /api/auth/me

GET  /api/patients
GET  /api/patients/:id        (Mongo _id or device localId)
POST /api/patients
PUT  /api/patients/:id

POST /api/sync                { patients: [...] } → { success, results: [{ localId, status, serverId?, error? }] }

GET  /api/health              no auth → { success, status, service, mongodb, time }
```

Default POC credentials: `DRAbhilash` / `Ved@123` (from `.env.example`).
**Change these before any production use.**

## Sync design

- `POST /api/sync` upserts each patient with
  `findOneAndUpdate({ localId }, …, { upsert: true })` — the unique index
  on `localId` guarantees no duplicates, even for replayed batches.
- Each patient is then forwarded to the Apps Script URL
  (`services/appsScriptService.ts`). A Sheets failure marks that item
  `FAILED`; the MongoDB record is kept and the device retries later.
- If `APPS_SCRIPT_URL` is empty, the Sheets step is skipped (dev mode).

## Security notes

- Single doctor account; credentials live only in server-side env vars and
  are compared with `crypto.timingSafeEqual`.
- Session cookie `bp.sid` is HTTP-only, `SameSite=lax`, 12h expiry,
  `secure` in production.
- CORS is restricted to `FRONTEND_URL` (comma-separated list allowed) with
  credentials enabled.
- All write bodies are validated with zod; error responses never leak
  stack traces in production.
