"use client";

import { useState } from "react";
import { CloudOff, Plus, Stethoscope, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DashboardStats } from "@/components/dashboard/dashboard-stats";
import { SyncStatusBadge } from "@/components/sync/sync-status-badge";
import { PatientForm } from "@/components/patients/patient-form";
import { usePatients, usePatientCounts } from "@/hooks/use-patients";
import { useSync } from "@/hooks/use-sync";
import type { Patient } from "@/types/patient";

function formatRelative(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  const { online } = useSync();
  return (
    <Card className="anim-card-enter overflow-hidden">
      <CardContent className="flex flex-col items-center px-6 py-14 text-center sm:py-20">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary" aria-hidden>
          <Stethoscope className="h-8 w-8" />
        </span>
        <h2 className="mt-6 text-xl font-semibold tracking-tight text-foreground">No patients yet</h2>
        <p className="mt-2 max-w-sm text-[15px] leading-relaxed text-muted-foreground">
          Add your first patient to begin building the clinic&rsquo;s records.
        </p>
        {!online && (
          <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-border bg-muted/60 px-4 py-1.5 text-[13px] text-muted-foreground">
            <CloudOff className="h-4 w-4" aria-hidden />
            You&rsquo;re offline — new records will be saved safely on this device.
          </p>
        )}
        <Button size="lg" className="mt-7" onClick={onAdd}>
          <Plus className="h-4 w-4" aria-hidden />
          Add Patient
        </Button>
      </CardContent>
    </Card>
  );
}

function RecentPatients({ patients }: { patients: Patient[] }) {
  const recent = patients.slice(0, 5);
  if (recent.length === 0) return null;
  return (
    <section aria-labelledby="recent-heading" className="mt-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 id="recent-heading" className="text-lg font-semibold tracking-tight text-foreground">
          Recently added
        </h2>
      </div>
      <Card className="overflow-hidden">
        <ul className="divide-y divide-border">
          {recent.map((p) => (
            <li key={p.localId} className="flex items-center gap-4 px-5 py-4 transition-colors duration-150 hover:bg-muted/40">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-medium text-foreground">{p.patientName}</p>
                <p className="mt-0.5 truncate text-sm text-muted-foreground">
                  {p.problem} · {formatRelative(p.createdAt)}
                </p>
              </div>
              <SyncStatusBadge status={p.syncStatus} />
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
}

export default function DashboardPage() {
  const patients = usePatients();
  const counts = usePatientCounts();
  const { online, pendingCount } = useSync();
  const [addOpen, setAddOpen] = useState(false);

  const loading = patients === undefined;

  return (
    <div className="anim-page-enter">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, Doctor
          </h1>
          <p className="mt-1.5 text-[15px] text-muted-foreground">
            Your clinic workspace — records stay safe on this device, online or not.
          </p>
        </div>
        {pendingCount === 0 && !loading && (
          <p className="inline-flex items-center gap-2 rounded-full bg-[hsl(var(--success-soft))] px-4 py-2 text-[13px] font-medium text-[hsl(var(--success))]">
            <CheckCircle2 className="h-4 w-4" aria-hidden />
            Everything is synced
          </p>
        )}
      </div>

      <DashboardStats counts={counts} />

      <div className="mt-6">
        {patients === undefined ? (
          <Card><CardContent className="py-14 text-center text-muted-foreground">Loading records…</CardContent></Card>
        ) : patients.length === 0 ? (
          <EmptyState onAdd={() => setAddOpen(true)} />
        ) : (
          <RecentPatients patients={patients} />
        )}
      </div>

      {!online && (patients ?? []).length > 0 && (
        <p className="mt-6 text-center text-sm text-muted-foreground" role="status">
          You&rsquo;re offline — new records will be saved safely on this device.
        </p>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-2xl" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="text-xl">Add Patient</DialogTitle>
            <DialogDescription>
              The record is saved on this device instantly — even offline — and syncs automatically.
            </DialogDescription>
          </DialogHeader>
          <PatientForm onSaved={() => setAddOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
