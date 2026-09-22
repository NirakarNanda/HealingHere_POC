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
 *  3. Paste it into SPREADSHEET_ID below (replace the placeholder!).
 *     If the placeholder is left in place, EVERY sync will fail with
 *     "Server error" and patient records will show FAILED in the app.
 *  4. In the script editor: Deploy -> New deployment -> Web app.
 *       Execute as: Me
 *       Who has access: Anyone   <- this is the setting that matters.
 *       (Sharing the *spreadsheet* with "anyone" does NOT fix sync —
 *        the backend talks to the *script deployment*, not the sheet.)
 *  5. Copy the Web app URL (ends in /exec) into the backend env as
 *       APPS_SCRIPT_URL=<web app url>
 *  6. Test in a browser: open the /exec URL ->
 *       {"success":true,"service":"Bijayalakshmi Physiotherapy Sync"}
 *     If you see a Google sign-in page instead, step 4's "Anyone" is wrong.
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
  // 'age' replaced 'dateOfBirth' on 2026-09-22. ensureHeaders_() appends it
  // as a new column; the old dateOfBirth column is left untouched as history.
  'age',
  'phone',
  'gender',
  'problem',
  'injuryHistory',
  'notes',
  'createdAt',
  'updatedAt',
  'syncedAt',
  'remainingPayment'
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
 * Patient upsert / delete. POST <web app url> with a JSON body.
 *
 * Actions:
 *   { "action": "upsertPatient", "patient": { ... } }  <- what the backend sends for sync
 *   { "action": "deletePatient", "localId": "..." }     <- backend sends on patient delete
 *   { "localId": "...", "patientName": "...", ... }     <- bare patient object (upsert)
 *
 * Always answers JSON: {success:true, ...} or {success:false, error:"..."}.
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  var lockAcquired = false;

  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse_({
        success: false,
        error: 'Empty request body — expected a JSON payload.'
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

    var action = body && body.action ? String(body.action) : 'upsertPatient';

    // Serialize concurrent writes so two simultaneous syncs for the same
    // localId cannot both decide "not found" and append duplicate rows.
    lockAcquired = lock.tryLock(10000);
    if (!lockAcquired) {
      return jsonResponse_({
        success: false,
        error: 'Server busy — could not acquire the write lock. Please retry.'
      });
    }

    if (action === 'deletePatient') {
      var deleteLocalId = body.localId || (body.patient && body.patient.localId);
      if (!deleteLocalId) {
        return jsonResponse_({ success: false, error: 'Missing required field: localId.' });
      }
      return jsonResponse_(deletePatient_(String(deleteLocalId)));
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
  ensureHeaders_(sheet);

  // One-time automatic migration: rows written before the age change have
  // dateOfBirth filled and age empty — fill age from dateOfBirth on the
  // first sync after this version is deployed. Also runnable manually from
  // the editor (select backfillAge_ and click Run).
  maybeBackfillAgeOnce_(sheet);

  // Per-row safety net: if a payload ever arrives with dateOfBirth but no
  // age (older client), convert on the spot so the sheet always gets an age.
  if ((patient.age === undefined || patient.age === null || patient.age === '') && patient.dateOfBirth) {
    patient.age = dobToAge_(String(patient.dateOfBirth));
  }

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

/** Whole years between a YYYY-MM-DD date string and today; '' when unusable. */
function dobToAge_(dob) {
  if (!dob) return '';
  var d = new Date(dob);
  if (isNaN(d.getTime()) || d.getTime() > Date.now()) return '';
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 31557600000));
}

/**
 * Fill every empty `age` cell from the legacy `dateOfBirth` column.
 * Returns the number of rows filled. Safe to run repeatedly — rows that
 * already have an age are never touched.
 */
function backfillAge_(sheet) {
  sheet = sheet || getOrCreateSheet_();
  ensureHeaders_(sheet);
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
    .map(function (h) { return String(h); });
  var ageCol = headers.indexOf('age') + 1;
  var dobCol = headers.indexOf('dateOfBirth') + 1;
  if (ageCol < 1 || dobCol < 1 || sheet.getLastRow() < 2) return 0;

  var lastRow = sheet.getLastRow();
  var ages = sheet.getRange(2, ageCol, lastRow - 1, 1).getValues();
  var dobs = sheet.getRange(2, dobCol, lastRow - 1, 1).getValues();
  var filled = 0;
  for (var i = 0; i < ages.length; i++) {
    var ageEmpty = ages[i][0] === '' || ages[i][0] === null || ages[i][0] === undefined;
    if (ageEmpty && dobs[i][0]) {
      var age = dobToAge_(String(dobs[i][0]));
      if (age !== '') {
        sheet.getRange(i + 2, ageCol).setValue(age);
        filled++;
      }
    }
  }
  if (filled > 0) SpreadsheetApp.flush();
  return filled;
}

/**
 * Run the DOB -> age backfill exactly once per script deployment.
 * Called automatically on the first upsert after publishing a new version,
 * so existing sheet rows convert themselves with no manual step.
 */
function maybeBackfillAgeOnce_(sheet) {
  var props = PropertiesService.getScriptProperties();
  if (props.getProperty('ageBackfilled_v1') === 'done') return;
  try {
    var filled = backfillAge_(sheet);
    Logger.log('backfillAge_: filled ' + filled + ' age cell(s) from dateOfBirth');
  } catch (err) {
    Logger.log('backfillAge_ failed: ' + err);
  }
  props.setProperty('ageBackfilled_v1', 'done');
}

/**
 * Delete the row whose column A equals localId. "Not found" is reported as
 * success with action "not_found" so retries stay idempotent — the row is
 * already gone, which is the desired end state.
 */
function deletePatient_(localId) {
  var sheet = getOrCreateSheet_();
  ensureHeaders_(sheet);

  var rowNumber = findRowByLocalId_(sheet, localId);
  if (rowNumber > 0) {
    sheet.deleteRow(rowNumber);
    SpreadsheetApp.flush();
    return { success: true, action: 'deleted', localId: localId };
  }
  return { success: true, action: 'not_found', localId: localId };
}

function getOrCreateSheet_() {
  var spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
  }
  return sheet;
}

/**
 * Writes the header row on a fresh sheet, and migrates an existing sheet
 * when new columns (e.g. remainingPayment) were added to HEADERS later:
 * missing headers are appended so old rows keep their columns aligned.
 */
function ensureHeaders_(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    return;
  }
  var existing = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
    .map(function (h) { return String(h); });
  var missing = HEADERS.filter(function (h) { return existing.indexOf(h) === -1; });
  if (missing.length > 0) {
    sheet.getRange(1, existing.length + 1, 1, missing.length).setValues([missing]);
    sheet.getRange(1, 1, 1, existing.length + missing.length).setFontWeight('bold');
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
          age: 35,
          phone: '+910000000000',
          gender: 'Other',
          problem: 'Script self-test',
          injuryHistory: '',
          notes: 'Created by testUpsert_ — safe to delete this row.',
          remainingPayment: 500,
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
