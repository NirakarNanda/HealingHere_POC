import { db } from "./database";
import type { PendingDelete } from "./database";
import type { Patient, PatientFormValues, PatientSyncPatch } from "@/types/patient";
import type { ServerPatient } from "@/lib/api/client";

/**
 * The ONLY module that talks to IndexedDB. UI components must never import
 * the database directly — they go through this repository or the hooks.
 */

function nowIso(): string {
  return new Date().toISOString();
}

export async function createPatient(values: PatientFormValues): Promise<Patient> {
  const timestamp = nowIso();
  const patient: Patient = {
    ...values,
    localId: crypto.randomUUID(),
    createdAt: timestamp,
    updatedAt: timestamp,
    syncStatus: "PENDING",
    syncAttempts: 0,
  };
  await db.patients.add(patient);
  return patient;
}

export async function getPatients(): Promise<Patient[]> {
  return db.patients.orderBy("createdAt").reverse().toArray();
}

export async function getPatient(localId: string): Promise<Patient | undefined> {
  return db.patients.get(localId);
}

/**
 * Local, offline-capable search across name and phone (case-insensitive).
 * Never touches the network or the backend.
 */
export async function searchPatients(query: string): Promise<Patient[]> {
  const q = query.trim().toLowerCase();
  if (!q) return getPatients();
  return db.patients
    .filter(
      (p) =>
        p.patientName.toLowerCase().includes(q) ||
        p.phone.replace(/[\s-]/g, "").includes(q.replace(/[\s-]/g, ""))
    )
    .reverse()
    .sortBy("createdAt");
}

export async function getPendingPatients(): Promise<Patient[]> {
  return db.patients.where("syncStatus").anyOf("PENDING", "FAILED").sortBy("createdAt");
}

export async function getFailedPatients(): Promise<Patient[]> {
  return db.patients.where("syncStatus").equals("FAILED").reverse().sortBy("createdAt");
}

export async function updateSyncStatus(localId: string, patch: PatientSyncPatch): Promise<void> {
  await db.patients.update(localId, { ...patch, updatedAt: nowIso() });
}

export async function updatePatient(localId: string, values: Partial<PatientFormValues>): Promise<void> {
  await db.patients.update(localId, { ...values, updatedAt: nowIso() });
}

/** Remove the local record immediately — the doctor asked for it. */
export async function deletePatientLocal(localId: string): Promise<void> {
  await db.patients.delete(localId);
}

/**
 * Reconcile one server record into the local database (pull / sync-down).
 *
 * - No local record → insert as SYNCED (new device, or created elsewhere).
 * - Local SYNCED record older than the server copy → update from server.
 * - Local PENDING/FAILED/SYNCING → SKIPPED: unsynced local work always wins;
 *   it will be pushed on the next sync. Never overwrite it with stale server data.
 */
export async function upsertPulledPatient(
  server: ServerPatient
): Promise<"inserted" | "updated" | "skipped"> {
  const local = await db.patients.get(server.localId);
  if (!local) {
    const patient: Patient = {
      localId: server.localId,
      patientName: server.patientName,
      age: server.age,
      phone: server.phone,
      gender: server.gender,
      problem: server.problem,
      injuryHistory: server.injuryHistory ?? "",
      notes: server.notes ?? "",
      remainingPayment: server.remainingPayment ?? 0,
      createdAt: server.createdAt,
      updatedAt: server.updatedAt,
      syncStatus: "SYNCED",
      syncAttempts: 0,
      syncedAt: server.syncedAt ?? undefined,
      serverId: server.id,
      lastSyncError: undefined,
    };
    await db.patients.add(patient);
    return "inserted";
  }
  if (local.syncStatus !== "SYNCED") return "skipped";
  if (server.updatedAt <= local.updatedAt) return "skipped";
  await db.patients.update(server.localId, {
    patientName: server.patientName,
    age: server.age,
    phone: server.phone,
    gender: server.gender,
    problem: server.problem,
    injuryHistory: server.injuryHistory ?? "",
    notes: server.notes ?? "",
    remainingPayment: server.remainingPayment ?? 0,
    createdAt: server.createdAt,
    updatedAt: server.updatedAt,
    syncedAt: server.syncedAt ?? undefined,
    serverId: server.id,
    lastSyncError: undefined,
  });
  return "updated";
}

/** Queue a remote deletion (MongoDB + sheet row) to flush on next sync. */
export async function queuePendingDelete(localId: string): Promise<void> {
  await db.pendingDeletes.put({ localId, deletedAt: nowIso() });
}

export async function getPendingDeletes(): Promise<PendingDelete[]> {
  return db.pendingDeletes.toArray();
}

export async function removePendingDelete(localId: string): Promise<void> {
  await db.pendingDeletes.delete(localId);
}

export async function countByStatus(status: Patient["syncStatus"]): Promise<number> {
  return db.patients.where("syncStatus").equals(status).count();
}

export async function countAll(): Promise<number> {
  return db.patients.count();
}

export async function countAddedToday(): Promise<number> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return db.patients.where("createdAt").aboveOrEqual(start.toISOString()).count();
}
