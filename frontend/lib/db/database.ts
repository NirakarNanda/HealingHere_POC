import Dexie, { type Table } from "dexie";
import type { Patient } from "@/types/patient";

/**
 * IndexedDB database — the local source of truth for the POC UI.
 * Everything the doctor sees comes from here first; the network is optional.
 */
class PhysioDatabase extends Dexie {
  patients!: Table<Patient, string>;

  constructor() {
    super("bijayalakshmi-physio");
    this.version(1).stores({
      // localId is the primary key and global idempotency key.
      patients: "localId, patientName, phone, syncStatus, createdAt",
    });
  }
}

export const db = new PhysioDatabase();
