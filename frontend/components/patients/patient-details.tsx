"use client";

import { useState } from "react";
import { Pencil, RefreshCw, Trash2 } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SyncStatusBadge } from "@/components/sync/sync-status-badge";
import { PatientForm } from "@/components/patients/patient-form";
import { triggerSync } from "@/lib/sync/sync-engine";
import { formatAge } from "@/lib/patients/age";
import type { Patient } from "@/types/patient";

function formatDateTime(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function formatINR(amount?: number): string {
  if (amount === undefined || amount === null || Number.isNaN(amount)) return "—";
  return `₹${amount.toLocaleString("en-IN")}`;
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
 *
 * The Edit button opens the patient form prefilled; saving updates the
 * record locally and re-queues it for sync. The sheet derives the patient
 * from the reactive query (see patients page), so edits appear instantly.
 */
export function PatientDetails({
  patient,
  open,
  onOpenChange,
  onDelete,
}: {
  patient: Patient | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called when the doctor confirms deletion. Should delete everywhere and toast. */
  onDelete?: (patient: Patient) => Promise<void>;
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);

  async function handleDelete() {
    if (!patient || !onDelete) return;
    setDeleting(true);
    try {
      await onDelete(patient);
      setConfirmingDelete(false);
      onOpenChange(false);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Sheet
        open={open}
        onOpenChange={(next) => {
          if (!next) {
            setConfirmingDelete(false);
            setEditing(false);
          }
          onOpenChange(next);
        }}
      >
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
                  <Field label="Age" value={formatAge(patient)} />
                  <Field label="Remaining payment" value={formatINR(patient.remainingPayment)} />
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
                    <>
                      {patient.lastSyncError && (
                        <p className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-[13px] leading-relaxed text-destructive">
                          {patient.lastSyncError}
                        </p>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-4"
                        onClick={() => triggerSync()}
                      >
                        <RefreshCw className="h-4 w-4" aria-hidden />
                        Retry sync
                      </Button>
                    </>
                  )}
                </div>

                <Separator />

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setEditing(true)}
                >
                  <Pencil className="h-4 w-4" aria-hidden />
                  Edit patient
                </Button>

                {/* Danger zone */}
                {!confirmingDelete ? (
                  <Button
                    variant="outline"
                    className="w-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setConfirmingDelete(true)}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                    Delete patient
                  </Button>
                ) : (
                  <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4">
                    <p className="text-sm font-medium text-foreground">
                      Delete {patient.patientName} permanently?
                    </p>
                    <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                      This removes the record from this device, the clinic server and the Google Sheet.
                      This cannot be undone.
                    </p>
                    <div className="mt-3 flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        disabled={deleting}
                        onClick={() => setConfirmingDelete(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="flex-1"
                        disabled={deleting}
                        onClick={handleDelete}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                        {deleting ? "Deleting…" : "Yes, delete"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Edit dialog — prefilled form; saving re-queues the record for sync. */}
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="sm:max-w-2xl" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="text-xl">Edit patient</DialogTitle>
            <DialogDescription>
              Changes save on this device instantly and sync automatically.
            </DialogDescription>
          </DialogHeader>
          {patient && (
            <PatientForm
              key={patient.localId + patient.updatedAt}
              patient={patient}
              onSaved={() => setEditing(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
