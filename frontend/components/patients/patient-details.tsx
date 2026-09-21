"use client";

import { RefreshCw } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SyncStatusBadge } from "@/components/sync/sync-status-badge";
import { triggerSync } from "@/lib/sync/sync-engine";
import type { Patient } from "@/types/patient";

function formatDateTime(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function formatDob(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso || "—"
    : d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="text-[15px] leading-relaxed text-foreground">{value?.trim() ? value : "—"}</dd>
    </div>
  );
}

/**
 * Polished patient detail view — slides in as a Sheet on tablet/mobile,
 * and is also used from the table on desktop.
 */
export function PatientDetails({
  patient,
  open,
  onOpenChange,
}: {
  patient: Patient | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-lg" aria-describedby={undefined}>
        {patient && (
          <>
            <SheetHeader className="pr-10">
              <div className="flex items-center gap-3">
                <SheetTitle className="text-xl">{patient.patientName}</SheetTitle>
                <SyncStatusBadge status={patient.syncStatus} />
              </div>
              <SheetDescription>
                Patient record · added {formatDateTime(patient.createdAt)}
              </SheetDescription>
            </SheetHeader>

            <div className="mt-6 space-y-6">
              <dl className="grid grid-cols-2 gap-5">
                <Field label="Phone" value={patient.phone} />
                <Field label="Gender" value={patient.gender} />
                <Field label="Date of birth" value={formatDob(patient.dateOfBirth)} />
                <Field label="Last updated" value={formatDateTime(patient.updatedAt)} />
              </dl>

              <Separator />

              <div className="space-y-5">
                <Field label="Chief complaint" value={patient.problem} />
                <Field label="Injury history" value={patient.injuryHistory} />
                <Field label="Notes" value={patient.notes} />
              </div>

              <Separator />

              <div className="rounded-lg bg-muted/50 p-4">
                <dl className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sync status</dt>
                    <dd className="mt-1.5"><SyncStatusBadge status={patient.syncStatus} /></dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sync attempts</dt>
                    <dd className="mt-1.5 text-foreground">{patient.syncAttempts}</dd>
                  </div>
                  {patient.syncedAt && (
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Synced at</dt>
                      <dd className="mt-1.5 text-foreground">{formatDateTime(patient.syncedAt)}</dd>
                    </div>
                  )}
                  {patient.lastSyncAttempt && (
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Last attempt</dt>
                      <dd className="mt-1.5 text-foreground">{formatDateTime(patient.lastSyncAttempt)}</dd>
                    </div>
                  )}
                </dl>
                {patient.syncStatus === "FAILED" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => triggerSync()}
                  >
                    <RefreshCw className="h-4 w-4" aria-hidden />
                    Retry sync
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
