/**
 * Bijayalakshmi Physiotherapy — Google Sheets sync endpoint.
 *
 * This script receives patient records from the Node.js backend
 * (POST /api/sync -> Apps Script -> Google Sheets) and upserts them into
 * the "Patients" sheet. `localId` is the idempotency key: re-sending the
 * same localId UPDATES the existing row instead of appending a duplicate.
 *
 * SETUP
 *  1. Create a Google Sheet (any name, e.g. "Bijayalakshmi Physiotherapy").
 *  2. Copy the spreadsheet ID from the sheet URL:
 *       https://docs.google.com/spreadsheets/d/<SPREADSHEET_ID>/edit
 *  3. Paste it into SPREADSHEET_ID below.
 *  4. In the script editor: Deploy -> New deployment -> Web app.
 *       Execute as: Me
 *       Who has access: Anyone
 *  5. Copy the Web app URL (ends in /exec) into the backend .env as
 *       APPS_SCRIPT_URL=<web app url>
 *  6. Test: curl -sL "<web app url>"  -> {"success":true,"service":"..."}
 *
 * IMPORTANT: after every code change, Deploy -> Manage deployments ->
 * edit the deployment -> New version, otherwise the live /exec URL keeps
 * running the old code.
 */

// REQUIRED: paste your spreadsheet ID here (from the sheet URL). Keep the quotes.
var SPREADSHEET_ID = 'PASTE_YOUR_SPREADSHEET_ID_HERE';
var SHEET_NAME = 'Patients';

var HEADERS = [
  'localId',
  'patientName',
  'dateOfBirth',
  'phone',
  'gender',
  'problem',
  'injuryHistory',
  'notes',
  'createdAt',
  'updatedAt',
  'syncedAt'
];

/* ------------------------------------------------------------------ */
/* HTTP handlers                                                       */
/* ------------------------------------------------------------------ */

/**
 * Health check. GET <web app url>
 * -> {"success":true,"service":"Bijayalakshmi Physiotherapy Sync"}
 */
function doGet(e) {
  return jsonResponse_({
    success: true,
    service: 'Bijayalakshmi Physiotherapy Sync'
  });
}

/**
 * Patient upsert. POST <web app url> with a JSON body.
 *
 * Accepts either shape:
 *   { "action": "upsertPatient", "patient": { ... } }   <- what the backend sends
 *   { "localId": "...", "patientName": "...", ... }     <- bare patient object
 *
 * Always answers JSON: {success:true, action:"inserted"|"updated", localId}
 * or {success:false, error:"..."}.
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  var lockAcquired = false;

  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse_({
        success: false,
        error: 'Empty request body — expected a JSON patient payload.'
      });
    }

    var body;
    try {
      body = JSON.parse(e.postData.contents);
    } catch (parseError) {
      return jsonResponse_({
        success: false,
        error: 'Request body is not valid JSON.'
      });
    }

    // Accept the wrapped envelope from the backend or a bare patient object.
    var patient = body && body.patient ? body.patient : body;

    if (!patient || typeof patient !== 'object') {
      return jsonResponse_({ success: false, error: 'Missing patient object.' });
    }
    if (!patient.localId) {
      return jsonResponse_({ success: false, error: 'Missing required field: localId.' });
    }
    if (!patient.patientName) {
      return jsonResponse_({ success: false, error: 'Missing required field: patientName.' });
    }

    // Serialize concurrent writes so two simultaneous syncs for the same
    // localId cannot both decide "not found" and append duplicate rows.
    lockAcquired = lock.tryLock(10000);
    if (!lockAcquired) {
      return jsonResponse_({
        success: false,
        error: 'Server busy — could not acquire the write lock. Please retry.'
      });
    }

    var result = upsertPatient_(patient);
    return jsonResponse_(result);
  } catch (err) {
    return jsonResponse_({
      success: false,
      error: 'Server error: ' + (err && err.message ? err.message : String(err))
    });
  } finally {
    if (lockAcquired) {
      lock.releaseLock();
    }
  }
}

/* ------------------------------------------------------------------ */
/* Sheet logic                                                         */
/* ------------------------------------------------------------------ */

/**
 * Insert a new row for the patient, or update the existing row when a row
 * with the same localId already exists. Never creates a duplicate row.
 */
function upsertPatient_(patient) {
  var sheet = getOrCreateSheet_();
  ensureHeaderRow_(sheet);

  var localId = String(patient.localId);
  var rowNumber = findRowByLocalId_(sheet, localId);

  var values = HEADERS.map(function (header) {
    var value = patient[header];
    return value === undefined || value === null ? '' : value;
  });

  var action;
  if (rowNumber > 0) {
    sheet.getRange(rowNumber, 1, 1, HEADERS.length).setValues([values]);
    action = 'updated';
  } else {
    sheet.appendRow(values);
    action = 'inserted';
  }

  SpreadsheetApp.flush();

  return { success: true, action: action, localId: localId };
}

function getOrCreateSheet_() {
  var spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
  }
  return sheet;
}

function ensureHeaderRow_(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
  }
}

/** Returns the 1-based row number whose column A equals localId, or -1. */
function findRowByLocalId_(sheet, localId) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return -1; // header only (or empty)
  }
  var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === localId) {
      return i + 2;
    }
  }
  return -1;
}

function jsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ------------------------------------------------------------------ */
/* Manual test helper (optional — run from the editor, not deployed)   */
/* ------------------------------------------------------------------ */

/**
 * Simulates a backend POST without leaving the editor. Run testUpsert_(),
 * then check the sheet for a TEST-LOCAL-ID-001 row (delete it afterwards).
 * Note: running doPost() directly from the editor fails because there is
 * no real HTTP event — this helper fabricates one instead.
 */
function testUpsert_() {
  var fakeEvent = {
    postData: {
      contents: JSON.stringify({
        action: 'upsertPatient',
        patient: {
          localId: 'TEST-LOCAL-ID-001',
          patientName: 'Test Patient (delete me)',
          dateOfBirth: '1990-01-01',
          phone: '+910000000000',
          gender: 'Other',
          problem: 'Script self-test',
          injuryHistory: '',
          notes: 'Created by testUpsert_ — safe to delete this row.',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          syncedAt: new Date().toISOString()
        }
      })
    }
  };
  var response = doPost(fakeEvent);
  Logger.log(response.getContent());
}
