import type { Patient } from "@/types/patient";

/**
 * Resolve a patient's display age in whole years.
 *
 * Prefers the `age` field; falls back to deriving it from the legacy
 * `dateOfBirth` (YYYY-MM-DD) still present on records created before the
 * 2026-09-22 age migration. Returns undefined when neither is usable.
 */
export function resolveAge(
  patient: Pick<Patient, "age" | "dateOfBirth"> | { age?: number; dateOfBirth?: string }
): number | undefined {
  if (typeof patient.age === "number" && Number.isFinite(patient.age)) {
    return Math.max(0, Math.floor(patient.age));
  }
  if (patient.dateOfBirth) {
    const dob = new Date(patient.dateOfBirth);
    if (!Number.isNaN(dob.getTime()) && dob.getTime() <= Date.now()) {
      return Math.max(0, Math.floor((Date.now() - dob.getTime()) / 31557600000));
    }
  }
  return undefined;
}

/** "42 years" / "1 year" / "—" for display. */
export function formatAge(patient: Pick<Patient, "age" | "dateOfBirth">): string {
  const age = resolveAge(patient);
  if (age === undefined) return "—";
  return age === 1 ? "1 year" : `${age} years`;
}
