import { toast } from "sonner";
import { apiFetch } from "@/lib/api/client";
import { getPendingPatients, updateSyncStatus } from "@/lib/db/patient-repository";
import type { Patient } from "@/types/patient";

/**
 * Sync queue engine.
 *
 * IndexedDB → POST /api/sync → MongoDB → Google Apps Script → Google Sheets
 *
 * The backend uses localId as the idempotency key, so retries are safe and
 * never create duplicate remote records. Local data is never deleted.
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
    return { synced: 0, failed: 0, total: 0 };
  }

  syncInFlight = true;
  try {
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
          });
        } else {
          failed += 1;
          await updateSyncStatus(p.localId, { syncStatus: "FAILED" });
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
