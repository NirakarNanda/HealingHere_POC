"use client";

import { ChevronRight, Phone } from "lucide-react";
import { SyncStatusBadge } from "@/components/sync/sync-status-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Patient } from "@/types/patient";

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * Touch-friendly patient card — used on tablet portrait and mobile.
 * Whole card is a 44px+ tap target; navigation never depends on hover.
 */
export function PatientCard({ patient, onSelect }: { patient: Patient; onSelect: (p: Patient) => void }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(patient)}
      aria-label={`View details for ${patient.patientName}`}
      className="group flex w-full items-center gap-4 rounded-lg border border-border bg-card p-4 text-left shadow-soft transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lift active:scale-[0.99] min-h-[76px]"
    >
      <Avatar className="h-12 w-12">
        <AvatarFallback>{initials(patient.patientName) || "?"}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-[15px] font-semibold text-foreground">{patient.patientName}</p>
          <SyncStatusBadge status={patient.syncStatus} />
        </div>
        <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5" aria-hidden />
            {patient.phone}
          </span>
          <span className="truncate">{patient.problem}</span>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Added {formatDate(patient.createdAt)}
        </p>
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
    </button>
  );
}

/**
 * Elegant desktop table — columns: name, phone, problem, date added, status.
 */
export function PatientTable({
  patients,
  onSelect,
}: {
  patients: Patient[];
  onSelect: (p: Patient) => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-soft">
      <div className="overflow-x-auto">
        <table className="w-full caption-bottom text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/60">
              <th scope="col" className="h-12 px-5 text-left align-middle text-xs font-semibold uppercase tracking-wider text-muted-foreground">Patient name</th>
              <th scope="col" className="h-12 px-5 text-left align-middle text-xs font-semibold uppercase tracking-wider text-muted-foreground">Phone</th>
              <th scope="col" className="h-12 px-5 text-left align-middle text-xs font-semibold uppercase tracking-wider text-muted-foreground">Problem</th>
              <th scope="col" className="h-12 px-5 text-left align-middle text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date added</th>
              <th scope="col" className="h-12 px-5 text-left align-middle text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sync status</th>
            </tr>
          </thead>
          <tbody>
            {patients.map((p) => (
              <tr
                key={p.localId}
                onClick={() => onSelect(p)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(p);
                  }
                }}
                tabIndex={0}
                className="cursor-pointer border-b border-border bg-card transition-colors duration-150 last:border-0 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              >
                <td className="px-5 py-4 align-middle">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="text-xs">{initials(p.patientName) || "?"}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-foreground">{p.patientName}</span>
                  </div>
                </td>
                <td className="px-5 py-4 align-middle text-muted-foreground">{p.phone}</td>
                <td className="max-w-[240px] truncate px-5 py-4 align-middle text-muted-foreground">{p.problem}</td>
                <td className="whitespace-nowrap px-5 py-4 align-middle text-muted-foreground">{formatDate(p.createdAt)}</td>
                <td className="px-5 py-4 align-middle">
                  <SyncStatusBadge status={p.syncStatus} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
