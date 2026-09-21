import Dexie, { type Table } from "dexie";
import type { Patient } from "@/types/patient";

/**
 * IndexedDB database — the local source of truth for the POC UI.
 * Everything the doctor sees comes from here first; the network is optional.
 */
/** A queued remote deletion: local record is already gone, the backend + sheet row still need removing. */
export interface PendingDelete {
  localId: string;
  deletedAt: string;
}

class PhysioDatabase extends Dexie {
  patients!: Table<Patient, string>;
  pendingDeletes!: Table<PendingDelete, string>;

  constructor() {
    super("bijayalakshmi-physio");
    this.version(1).stores({
      // localId is the primary key and global idempotency key.
      patients: "localId, patientName, phone, syncStatus, createdAt",
    });
    // v2: queue of remote deletions to flush when back online.
    this.version(2).stores({
      patients: "localId, patientName, phone, syncStatus, createdAt",
      pendingDeletes: "localId",
    });
  }
}

export const db = new PhysioDatabase();
