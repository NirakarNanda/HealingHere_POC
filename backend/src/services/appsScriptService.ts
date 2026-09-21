/**
 * Apps Script service — forwards synced patients to Google Sheets via the
 * deployed Google Apps Script web app.
 *
 * Design rules:
 * - Never throws: always returns a result object so one bad forward can't
 *   crash a sync batch.
 * - If APPS_SCRIPT_URL is empty, the Sheets step is skipped and treated as
 *   satisfied (dev/offline-sheet mode).
 * - 12s timeout via AbortController; non-2xx or {success:false} from the
 *   script counts as failure with a clear error string.
 */
import { env } from '../config/env';
import type { PatientPayload } from '../types';

const APPS_SCRIPT_TIMEOUT_MS = 12_000;

export interface AppsScriptResult {
  ok: boolean;
  skipped?: boolean;
  error?: string;
}

interface SheetPatient {
  localId: string;
  patientName: string;
  dateOfBirth: string;
  phone: string;
  gender: string;
  problem: string;
  injuryHistory: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  syncedAt: string;
}

export async function pushPatientToSheet(
  patient: PatientPayload & { syncedAt: string },
): Promise<AppsScriptResult> {
  if (!env.appsScriptUrl) {
    // Dev mode: no Apps Script configured — Sheets step treated as satisfied.
    return { ok: true, skipped: true };
  }

  const payload: SheetPatient = {
    localId: patient.localId,
    patientName: patient.patientName,
    dateOfBirth: patient.dateOfBirth,
    phone: patient.phone,
    gender: patient.gender,
    problem: patient.problem,
    injuryHistory: patient.injuryHistory,
    notes: patient.notes,
    createdAt: patient.createdAt,
    updatedAt: patient.updatedAt,
    syncedAt: patient.syncedAt,
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), APPS_SCRIPT_TIMEOUT_MS);

  try {
    const response = await fetch(env.appsScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'upsertPatient', patient: payload }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return {
        ok: false,
        error: `Apps Script responded with HTTP ${response.status}`,
      };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      return { ok: false, error: 'Apps Script returned a non-JSON response' };
    }

    if (
      typeof data !== 'object' ||
      data === null ||
      (data as { success?: unknown }).success !== true
    ) {
      const detail =
        (data as { error?: string; message?: string } | null)?.error ??
        (data as { error?: string; message?: string } | null)?.message ??
        'unknown response';
      return { ok: false, error: `Apps Script reported failure: ${detail}` };
    }

    return { ok: true };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return { ok: false, error: 'Apps Script request timed out after 12s' };
    }
    return {
      ok: false,
      error: `Apps Script request failed: ${err instanceof Error ? err.message : 'unknown error'}`,
    };
  } finally {
    clearTimeout(timer);
  }
}
