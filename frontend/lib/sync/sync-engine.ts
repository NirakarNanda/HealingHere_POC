import { toast } from "sonner";
import { ApiError, apiFetch, patientsApi } from "@/lib/api/client";
import {
  deletePatientLocal,
  getPatient,
  getPatients,
  getPendingDeletes,
  getPendingPatients,
  queuePendingDelete,
  removePendingDelete,
  updatePatient,
  updateSyncStatus,
  upsertPulledPatient,
} from "@/lib/db/patient-repository";
import { resolveAge } from "@/lib/patients/age";
import type { Patient, PatientFormValues } from "@/types/patient";

/**
 * Sync queue engine.
 *
 * IndexedDB → POST /api/sync → MongoDB → Google Apps Script → Google Sheets
 *
 * The backend uses localId as the idempotency key, so retries are safe and
 * never create duplicate remote records. Local data is never deleted by sync.
 * Queued remote deletions (patients the doctor deleted on-device) are
 * flushed here too, so sheet rows are removed even for offline deletes.
 */

export interface SyncSummary {
  synced: number;
  failed: number;
  total: number;
}

interface SyncResultItem {
  localId: string;
  ok?: boolean;
  success?: boolean;
  /** Backend contract: 'SYNCED' | 'FAILED' */
  status?: string;
  serverId?: string;
  error?: string;
}

interface SyncResponse {
  results?: SyncResultItem[];
  synced?: SyncResultItem[];
  failed?: SyncResultItem[];
}

let syncInFlight = false;

export function isSyncing(): boolean {
  return syncInFlight;
}

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Push every PENDING/FAILED patient to the backend.
 * Concurrent calls are ignored (module-level lock).
 * Shows feedback toasts; never throws on partial failure.
 */
export async function syncNow(): Promise<SyncSummary> {
  if (syncInFlight) {
    return { synced: 0, failed: 0, total: 0 };
  }
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { synced: 0, failed: 0, total: 0 };
  }

  const queue = await getPendingPatients();
  if (queue.length === 0) {
    // Nothing to push — still flush any queued remote deletions.
    await flushPendingDeletes();
    return { synced: 0, failed: 0, total: 0 };
  }

  syncInFlight = true;
  try {
    // Remote deletions first: a deleted-then-recreated localId must not
    // resurrect a sheet row that was queued for deletion.
    await flushPendingDeletes();

    const timestamp = nowIso();

    // Mark everything SYNCING so the UI reflects progress immediately.
    await Promise.all(
      queue.map((p) =>
        updateSyncStatus(p.localId, {
          syncStatus: "SYNCING",
          syncAttempts: p.syncAttempts + 1,
          lastSyncAttempt: timestamp,
        })
      )
    );

    const payload = queue.map((p: Patient) => ({
      localId: p.localId,
      patientName: p.patientName,
      // resolveAge falls back to the legacy dateOfBirth on pre-migration
      // local records so the doctor's existing data still syncs.
      age: resolveAge(p) ?? 0,
      phone: p.phone,
      gender: p.gender,
      problem: p.problem,
      injuryHistory: p.injuryHistory,
      notes: p.notes,
      remainingPayment: p.remainingPayment ?? 0,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));

    let response: SyncResponse;
    try {
      response = await apiFetch<SyncResponse>("/sync", {
        method: "POST",
        body: { patients: payload },
      });
    } catch {
      // Whole request failed (server down, session expired, offline).
      await Promise.all(
        queue.map((p) => updateSyncStatus(p.localId, { syncStatus: "FAILED" }))
      );
      toast.error("Sync unsuccessful · Your local data is safe");
      return { synced: 0, failed: queue.length, total: queue.length };
    }

    const items: SyncResultItem[] = Array.isArray(response.results)
      ? response.results
      : [...(response.synced ?? []).map((r) => ({ ...r, ok: true })),
         ...(response.failed ?? []).map((r) => ({ ...r, ok: false }))];
    const byLocalId = new Map(items.map((i) => [i.localId, i]));

    let synced = 0;
    let failed = 0;
    // Set when a record was edited while this sync was in flight — the
    // server received stale values, so one follow-up pass re-pushes it.
    let editedMidSync = false;

    await Promise.all(
      queue.map(async (p) => {
        const result = byLocalId.get(p.localId);
        // Backend contract uses `status: "SYNCED" | "FAILED"`; accept legacy
        // `ok` / `success` booleans too.
        const ok =
          result?.ok ?? result?.success ?? (result?.status === "SYNCED");

        // The doctor may have edited this record after the payload was
        // built. updatedAt changed → the server got stale values: keep the
        // record queued instead of marking it SYNCED.
        const current = await getPatient(p.localId);
        if (!current) return; // deleted mid-sync; nothing to mark.
        if (current.updatedAt !== p.updatedAt) {
          editedMidSync = true;
          await updateSyncStatus(p.localId, {
            syncStatus: "PENDING",
            syncAttempts: 0,
            lastSyncError: undefined,
          });
          return;
        }

        if (ok) {
          synced += 1;
          await updateSyncStatus(p.localId, {
            syncStatus: "SYNCED",
            syncedAt: nowIso(),
            serverId: result?.serverId,
            lastSyncError: undefined,
          });
        } else {
          failed += 1;
          await updateSyncStatus(p.localId, {
            syncStatus: "FAILED",
            lastSyncError: result?.error ?? "Sync failed without a server message.",
          });
        }
      })
    );

    if (failed === 0) {
      toast.success(queue.length === 1 ? "Patient synced successfully" : `${synced} records synced`);
    } else if (synced === 0) {
      toast.error("Sync unsuccessful · Your local data is safe");
    } else {
      toast.warning(`${synced} synced · ${failed} requires retry`);
    }

    const summary = { synced, failed, total: queue.length };
    if (editedMidSync) {
      // A record changed under this sync — push the fresh values now that
      // the lock is released. Fire-and-forget; it toasts on its own.
      setTimeout(() => triggerSync(), 300);
    }
    return summary;
  } finally {
    syncInFlight = false;
  }
}

/** Fire-and-forget full sync — safe to call from event handlers. */
export function triggerSync(): void {
  fullSync().catch(() => {
    // fullSync already handles its own errors and toasts.
  });
}

export interface PullSummary {
  pulled: number;
  removed: number;
}

function isOffline(): boolean {
  return typeof navigator !== "undefined" && !navigator.onLine;
}

/**
 * Pull server records down (sync-down).
 *
 * This is what makes a second device (or a fresh browser) see existing
 * data after login, and what propagates deletions made elsewhere:
 * - Server records missing locally are inserted as SYNCED.
 * - Local SYNCED records missing from the server were deleted elsewhere
 *   and are removed locally.
 * - Local PENDING/FAILED/SYNCING records are NEVER overwritten or deleted:
 *   unsynced work always wins and will be pushed on the next sync.
 *
 * Throws on network/API failure so callers can message it appropriately.
 */
export async function pullNow(): Promise<PullSummary> {
  if (syncInFlight) return { pulled: 0, removed: 0 };
  if (isOffline()) {
    throw new ApiError("You're offline — showing on-device records.", 0);
  }
  syncInFlight = true;
  try {
    const res = await patientsApi.listPatients();
    const serverPatients = res.patients ?? [];
    const serverIds = new Set(serverPatients.map((p) => p.localId));

    let pulled = 0;
    for (const sp of serverPatients) {
      const result = await upsertPulledPatient(sp);
      if (result !== "skipped") pulled += 1;
    }

    let removed = 0;
    const locals = await getPatients();
    for (const local of locals) {
      if (local.syncStatus === "SYNCED" && !serverIds.has(local.localId)) {
        await deletePatientLocal(local.localId);
        removed += 1;
      }
    }
    return { pulled, removed };
  } finally {
    syncInFlight = false;
  }
}

/**
 * Full two-way sync: push local changes, then pull server changes.
 * Shows feedback toasts; safe to call from anywhere.
 */
export async function fullSync(): Promise<void> {
  await syncNow();
  if (isOffline()) return;
  try {
    const { pulled, removed } = await pullNow();
    if (pulled > 0 || removed > 0) {
      const parts: string[] = [];
      if (pulled > 0) parts.push(`${pulled} record${pulled === 1 ? "" : "s"} loaded`);
      if (removed > 0) parts.push(`${removed} removed elsewhere`);
      toast.success(`Synced with server · ${parts.join(" · ")}`);
    }
  } catch {
    // Pull is best-effort after a push; push results were already toasted.
    // The next sync will retry the pull.
  }
}

/**
 * Push queued remote deletions (MongoDB + sheet row) to the backend.
 * A 404 from the backend means the record is already gone remotely — the
 * queue entry is dropped. Anything else stays queued for the next sync.
 */
async function flushPendingDeletes(): Promise<void> {
  const pending = await getPendingDeletes();
  for (const item of pending) {
    try {
      const res = await patientsApi.deletePatient(item.localId);
      // Only drop the queue entry when the sheet row is gone too —
      // otherwise keep retrying on the next sync.
      if (res.sheetDeleted) {
        await removePendingDelete(item.localId);
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        await removePendingDelete(item.localId);
      }
      // Network/auth errors: keep queued, retry next time.
    }
  }
}

export type DeleteRemoteOutcome = "deleted" | "queued" | "local-only";

export interface DeleteResult {
  outcome: DeleteRemoteOutcome;
  /**
   * Present when the server removed the record but the Google Sheet row
   * removal failed — the deletion stays queued for retry, and the caller
   * should show this reason instead of a generic message.
   */
  sheetError?: string;
}

/**
 * Delete a patient everywhere: local record goes immediately (the doctor's
 * explicit intent), then the backend + sheet row. When offline or the
 * remote call fails, the deletion is queued and flushed by the next sync.
 */
export async function deletePatientRecord(patient: Patient): Promise<DeleteResult> {
  const mayExistRemotely = Boolean(patient.serverId) || patient.syncStatus !== "PENDING";

  // Local first — never lose the doctor's intent.
  await deletePatientLocal(patient.localId);

  if (!mayExistRemotely) return { outcome: "local-only" };

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    await queuePendingDelete(patient.localId);
    return { outcome: "queued" };
  }

  try {
    const res = await patientsApi.deletePatient(patient.localId);
    if (res.sheetDeleted) return { outcome: "deleted" };
    await queuePendingDelete(patient.localId);
    return { outcome: "queued", sheetError: res.sheetError };
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return { outcome: "deleted" };
    await queuePendingDelete(patient.localId);
    return { outcome: "queued" };
  }
}

/**
 * Edit a patient record: update it locally immediately (the doctor's intent
 * is never lost), then re-queue it for sync so the server + sheet row get
 * the fresh values on the next push.
 *
 * Records that never synced stay PENDING/FAILED (they'll push anyway);
 * SYNCED records flip back to PENDING so the edit travels upstream.
 * A record edited mid-sync is detected by syncNow's updatedAt guard and
 * re-pushed on a follow-up pass.
 */
export async function editPatientRecord(
  localId: string,
  values: PatientFormValues
): Promise<void> {
  const existing = await getPatient(localId);
  await updatePatient(localId, values);
  await updateSyncStatus(localId, {
    syncStatus:
      existing && existing.syncStatus !== "SYNCED" ? existing.syncStatus : "PENDING",
    syncAttempts: 0,
    lastSyncError: undefined,
  });
  triggerSync();
}
