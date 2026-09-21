import { toast } from "sonner";
import { ApiError, apiFetch, patientsApi } from "@/lib/api/client";
import {
  deletePatientLocal,
  getPendingDeletes,
  getPendingPatients,
  queuePendingDelete,
  removePendingDelete,
  updateSyncStatus,
} from "@/lib/db/patient-repository";
import type { Patient } from "@/types/patient";

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
      dateOfBirth: p.dateOfBirth,
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

    await Promise.all(
      queue.map(async (p) => {
        const result = byLocalId.get(p.localId);
        const ok = result?.ok ?? result?.success ?? false;
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

    return { synced, failed, total: queue.length };
  } finally {
    syncInFlight = false;
  }
}

/** Fire-and-forget sync trigger — safe to call from event handlers. */
export function triggerSync(): void {
  syncNow().catch(() => {
    // syncNow already handles its own errors and toasts.
  });
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

/**
 * Delete a patient everywhere: local record goes immediately (the doctor's
 * explicit intent), then the backend + sheet row. When offline or the
 * remote call fails, the deletion is queued and flushed by the next sync.
 */
export async function deletePatientRecord(patient: Patient): Promise<DeleteRemoteOutcome> {
  const mayExistRemotely = Boolean(patient.serverId) || patient.syncStatus !== "PENDING";

  // Local first — never lose the doctor's intent.
  await deletePatientLocal(patient.localId);

  if (!mayExistRemotely) return "local-only";

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    await queuePendingDelete(patient.localId);
    return "queued";
  }

  try {
    const res = await patientsApi.deletePatient(patient.localId);
    if (res.sheetDeleted) return "deleted";
    await queuePendingDelete(patient.localId);
    return "queued";
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return "deleted";
    await queuePendingDelete(patient.localId);
    return "queued";
  }
}
