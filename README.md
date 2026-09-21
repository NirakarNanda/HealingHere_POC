# 🌿 Bijayalakshmi Physiotherapy

*Restoring movement. Rebuilding confidence. Syncing patients even when the Wi-Fi gives up.* 💪

A complete, working, offline-first clinic app for **Dr. Abhilash Nanda** — built for the iPad on his desk, happy everywhere else too.

```
Patient Form → 📱 IndexedDB → 🔄 Sync Queue → 🖥️ Backend → 🍃 MongoDB → 📊 Google Sheets
```

No internet? No drama. Records save instantly on the device and sync themselves the moment you're back online. The doctor should never have to think about it.

## ⚡ Quickstart

```bash
# 1. Backend (needs MongoDB running locally on 27017)
cd backend && cp .env.example .env && npm install && npm run dev

# 2. Frontend
cd frontend && cp .env.example .env && npm install && npm run dev
```

Open http://localhost:3000 → hit **Doctor Login** → you're in. 🩺

## 🔑 Doctor login

- **Username:** `DRAbhilash`
- **Password:** `Ved@123`

> ⚠️ POC credentials — change them in `backend/.env` before anything real. Seriously.

## 🗺️ What's where

| Folder | What's inside |
|---|---|
| `frontend/` | Next.js + shadcn/ui, light/dark themes, offline-first patient records, PWA |
| `backend/` | Express + TypeScript + Mongoose API, session auth, `/api/sync` |
| `google-apps-script/` | `Code.gs` — the bridge to Google Sheets (setup guide inside) |

## 🧪 Try the magic trick

1. Log in, turn your Wi-Fi **off** 📴
2. Add a patient — it saves instantly, badge says **◷ Pending**
3. Refresh. Search. It's all still there — pure local magic ✨
4. Turn Wi-Fi **on** 📶 — watch it sync itself to **✓ Synced**, no taps needed

Want the full story — architecture diagrams, test checklists, iPad install, deployment? The detailed docs live in [`frontend/`](frontend/), [`backend/`](backend/) and [`google-apps-script/`](google-apps-script/) READMEs. This one is just the trailer. 🎬
