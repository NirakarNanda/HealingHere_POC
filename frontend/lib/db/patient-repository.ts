import { db } from "./database";
import type { Patient, PatientFormValues, PatientSyncPatch } from "@/types/patient";

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
