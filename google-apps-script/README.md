# Google Apps Script — Google Sheets Sync

This folder contains the Apps Script that receives patient records from the
backend (`POST /api/sync` → Apps Script → Google Sheets) and writes them into
a Google Sheet. It is the last hop of the offline-first pipeline:

```
IndexedDB → Sync Queue → Backend API → MongoDB → Apps Script → Google Sheets
```

`localId` is the idempotency key at every hop. If the same patient is sent
twice (retry, double sync), the script **updates the existing row** instead of
appending a duplicate.

## Prerequisites

- A Google account.
- The backend running locally (see the root `README.md`).

## Step 1 — Create the Google Sheet

1. Go to [sheets.google.com](https://sheets.google.com) and create a blank
   spreadsheet. Name it e.g. **Bijayalakshmi Physiotherapy**.
2. Copy the **spreadsheet ID** from the URL:
   ```
   https://docs.google.com/spreadsheets/d/<THIS_PART_IS_THE_ID>/edit
   ```

## Step 2 — Create the Apps Script project

1. In the spreadsheet: **Extensions → Apps Script**. A new script project opens.
2. Delete any code in `Code.gs`.
3. Copy the entire contents of [`Code.gs`](./Code.gs) in this folder and paste
   it in.
4. At the top of the file, replace the placeholder with your spreadsheet ID:
   ```js
   var SPREADSHEET_ID = '1AbC...your-id-here...XyZ';
   ```
5. **File → Save** (name the project e.g. `Bijayalakshmi Physiotherapy Sync`).

## Step 3 — Deploy as a web app

1. Click **Deploy → New deployment**.
2. Click the gear icon next to "Select type" → choose **Web app**.
3. Fill in:
   - **Description:** `Patient sync v1`
   - **Execute as:** `Me`
   - **Who has access:** `Anyone`
     - This must be **Anyone** (anonymous). If you pick "Anyone with Google
       account", the backend's server-to-server POST gets a Google login page
       instead of reaching `doPost`.
4. Click **Deploy**, authorize the script when prompted (it needs permission to
   read/write your spreadsheets — that is exactly what it does).
5. Copy the **Web app URL**. It looks like:
   ```
   https://script.google.com/macros/s/AKfyc.../exec
   ```

## Step 4 — Wire it into the backend

In `backend/.env`, set:

```env
APPS_SCRIPT_URL=https://script.google.com/macros/s/AKfyc.../exec
```

Restart the backend (`npm run dev`). On startup it logs a line only when the
URL is *missing*, so silence here means the Sheets step is active.

> Leave `APPS_SCRIPT_URL` empty during early development if you want — the
> backend then skips the Sheets hop (treated as satisfied) and still persists
> everything to MongoDB. The server logs this clearly at startup.

## Step 5 — Test it

**Health check (GET):**

```bash
curl -sL "https://script.google.com/macros/s/AKfyc.../exec"
```

Expected (the `302` redirect without `-L` is normal Google sandboxing — always
use `-L`):

```json
{"success":true,"service":"Bijayalakshmi Physiotherapy Sync"}
```

**Write test (POST):** send a patient the same way the backend does:

```bash
curl -sL -X POST "https://script.google.com/macros/s/AKfyc.../exec" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "upsertPatient",
    "patient": {
      "localId": "TEST-LOCAL-ID-001",
      "patientName": "Test Patient (delete me)",
      "dateOfBirth": "1990-01-01",
      "phone": "+910000000000",
      "gender": "Other",
      "problem": "Script self-test",
      "injuryHistory": "",
      "notes": "Safe to delete this row.",
      "createdAt": "2026-09-21T00:00:00.000Z",
      "updatedAt": "2026-09-21T00:00:00.000Z",
      "syncedAt": "2026-09-21T00:00:00.000Z"
    }
  }'
```

Expected:

```json
{"success":true,"action":"inserted","localId":"TEST-LOCAL-ID-001"}
```

Then open the spreadsheet: a **Patients** tab appears (created automatically)
with the header row and your test row. Delete the test row afterwards.

You can also run the built-in `testUpsert_()` function from the script editor
(Run → testUpsert_) and inspect the result in **Executions → Logs**. Note:
clicking Run on `doPost` itself always fails with "cannot read postData" —
that is expected, `doPost` needs a real HTTP event.

## Step 6 — Verify end-to-end

1. Add a patient in the app while online.
2. The patient should reach the **Patients** sheet within seconds (check the
   `syncedAt` column).
3. Re-send the same patient (e.g. press **Sync Now** twice): the sheet must
   still contain **exactly one row** for that `localId` — the second write
   returns `{"success":true,"action":"updated",...}`.

## Duplicate protection

Duplicates are prevented at every layer, keyed on `localId`:

| Layer        | Mechanism                                              |
|--------------|--------------------------------------------------------|
| IndexedDB    | `localId` is the Dexie primary key                     |
| Backend      | MongoDB unique index on `localId` + upsert             |
| Apps Script  | `LockService` script lock + column-A scan before write |
| Google Sheet | same `localId` → row updated in place, never appended   |

The script lock (`tryLock(10s)`) guards the race where two syncs for the same
patient arrive simultaneously: the loser waits or retries instead of both
appending.

## After changing the code

Apps Script deployments are versioned snapshots. After **any** edit to
`Code.gs`:

1. **Deploy → Manage deployments** → pencil icon → **New version** → Deploy.

Until you do this, the live `/exec` URL keeps running the old code.

## Troubleshooting

- **`{"success":false,"error":"..."}` from POST** — read the `error` field;
  common causes: wrong `SPREADSHEET_ID`, or the script was never authorized.
- **HTML login page instead of JSON** — redeploy with **Who has access:
  Anyone**.
- **Old behavior after editing code** — you deployed a new version? (See above.)
- **Backend logs "Apps Script request timed out"** — the script has 12s per
  call; check **Executions** in the editor for the failing run.
- **Rows land in the wrong tab** — the script always uses the tab named
  `Patients` (created if missing); it never uses "the active sheet".
