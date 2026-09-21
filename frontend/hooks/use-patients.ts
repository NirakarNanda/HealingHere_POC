"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db/database";
import type { Patient } from "@/types/patient";

/** Reactive list of all patients, newest first. */
export function usePatients(): Patient[] | undefined {
  return useLiveQuery(() => db.patients.orderBy("createdAt").reverse().toArray(), []);
}

/** Reactive, offline-capable search across name and phone. */
export function usePatientSearch(query: string): Patient[] | undefined {
  const q = query.trim().toLowerCase();
  return useLiveQuery(async () => {
    if (!q) return db.patients.orderBy("createdAt").reverse().toArray();
    const cleaned = q.replace(/[\s-]/g, "");
    return db.patients
      .filter(
        (p) =>
          p.patientName.toLowerCase().includes(q) ||
          p.phone.replace(/[\s-]/g, "").includes(cleaned)
      )
      .reverse()
      .sortBy("createdAt");
  }, [q]);
}

/** Reactive dashboard counters, computed from the local database. */
export interface PatientCounts {
  total: number;
  addedToday: number;
  pending: number;
  failed: number;
}

export function usePatientCounts(): PatientCounts {
  const patients = useLiveQuery(() => db.patients.toArray(), []);
  if (!patients) return { total: 0, addedToday: 0, pending: 0, failed: 0 };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString();

  return {
    total: patients.length,
    addedToday: patients.filter((p) => p.createdAt >= todayIso).length,
    pending: patients.filter((p) => p.syncStatus === "PENDING" || p.syncStatus === "SYNCING").length,
    failed: patients.filter((p) => p.syncStatus === "FAILED").length,
  };
}
