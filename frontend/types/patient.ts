/** Shared patient model for the Bijayalakshmi Physiotherapy POC. */

export type SyncStatus = "PENDING" | "SYNCING" | "SYNCED" | "FAILED";

export interface Patient {
  /** UUID generated on-device at creation; idempotency key across every layer. */
  localId: string;

  patientName: string;
  /** ISO date string (yyyy-MM-dd) */
  dateOfBirth: string;
  phone: string;
  gender: string;
  problem: string;
  injuryHistory: string;
  notes: string;

  /** ISO datetime strings */
  createdAt: string;
  updatedAt: string;

  syncStatus: SyncStatus;
  syncAttempts: number;
  lastSyncAttempt?: string;
  syncedAt?: string;

  /** Backend MongoDB _id, set once the record syncs. */
  serverId?: string;
}

/** Fields the doctor enters on the patient form. */
export type PatientFormValues = Pick<
  Patient,
  "patientName" | "dateOfBirth" | "phone" | "gender" | "problem" | "injuryHistory" | "notes"
>;

export type PatientSyncPatch = Partial<
  Pick<Patient, "syncStatus" | "syncAttempts" | "lastSyncAttempt" | "syncedAt" | "serverId" | "updatedAt">
>;
