"use client";

import { useState } from "react";
import { toast } from "sonner";
import { SearchX } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PatientSearch } from "@/components/patients/patient-search";
import { PatientCard, PatientTable } from "@/components/patients/patient-list";
import { PatientDetails } from "@/components/patients/patient-details";
import { usePatientSearch } from "@/hooks/use-patients";
import { deletePatientRecord } from "@/lib/sync/sync-engine";
import type { Patient } from "@/types/patient";

export default function PatientsPage() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Patient | null>(null);
  const results = usePatientSearch(query);

  const loading = results === undefined;

  async function handleDelete(patient: Patient): Promise<void> {
    try {
      const outcome = await deletePatientRecord(patient);
      if (outcome === "queued") {
        toast.success("Patient deleted · will remove from server when back online");
      } else {
        toast.success("Patient deleted");
      }
    } catch {
      toast.error("Could not delete the patient. Please try again.");
      throw new Error("delete-failed");
    }
  }

  return (
    <div className="anim-page-enter">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Patient Records
          </h1>
          <p className="mt-1.5 text-[15px] text-muted-foreground">
            {loading
              ? "Loading…"
              : query.trim()
                ? `${results.length} result${results.length === 1 ? "" : "s"}`
                : `${results.length} patient${results.length === 1 ? "" : "s"} on this device`}
          </p>
        </div>
        <PatientSearch value={query} onChange={setQuery} />
      </div>

      {loading ? (
        <div className="space-y-3" aria-hidden>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[76px] w-full rounded-lg" />
          ))}
        </div>
      ) : results.length === 0 ? (
        <Card className="anim-card-enter">
          <CardContent className="flex flex-col items-center px-6 py-14 text-center sm:py-20">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground" aria-hidden>
              <SearchX className="h-7 w-7" />
            </span>
            <h2 className="mt-5 text-lg font-semibold tracking-tight text-foreground">
              {query.trim() ? "No matching patients" : "No patients yet"}
            </h2>
            <p className="mt-2 max-w-sm text-[15px] leading-relaxed text-muted-foreground">
              {query.trim()
                ? "Try a different name or phone number. Search works fully offline."
                : "Add your first patient to begin building the clinic's records."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop: elegant table */}
          <div className="hidden lg:block">
            <PatientTable patients={results} onSelect={setSelected} />
          </div>
          {/* Tablet portrait + mobile: touch-friendly cards */}
          <div className="grid gap-3 sm:grid-cols-2 lg:hidden">
            {results.map((p) => (
              <PatientCard key={p.localId} patient={p} onSelect={setSelected} />
            ))}
          </div>
        </>
      )}

      <PatientDetails
        patient={selected}
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        onDelete={handleDelete}
      />
    </div>
  );
}
