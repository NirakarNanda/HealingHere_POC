"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { PatientForm } from "@/components/patients/patient-form";
import { authApi, ApiError } from "@/lib/api/client";

/**
 * Authenticated shell: route guard + header + Add Patient dialog.
 * While the session is being verified, show a calm skeleton — never flash
 * protected content to an unauthenticated visitor.
 *
 * Offline resilience: if the device is offline the session can't be verified,
 * so the doctor keeps working from the local IndexedDB records and the
 * session is re-verified automatically when connectivity returns.
 */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function verify() {
      try {
        const res = await authApi.me();
        if (cancelled) return;
        if (res.authenticated) {
          setAuthorized(true);
        } else {
          router.replace("/login");
        }
      } catch (err) {
        if (cancelled) return;
        const unreachable =
          err instanceof ApiError && (err.status === 0 || err.status === 503);
        if (unreachable && typeof navigator !== "undefined" && !navigator.onLine) {
          // Offline: trust the last known session, re-verify on reconnect.
          setAuthorized(true);
        } else {
          router.replace("/login");
        }
      }
    }

    verify();

    const onOnline = () => {
      // Re-verify the session when connectivity returns.
      authApi
        .me()
        .then((res) => {
          if (!res.authenticated) router.replace("/login");
        })
        .catch(() => router.replace("/login"));
    };
    window.addEventListener("online", onOnline);
    return () => {
      cancelled = true;
      window.removeEventListener("online", onOnline);
    };
  }, [router]);

  if (!authorized) {
    return (
      <div className="min-h-dvh bg-background">
        <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
          <div className="flex items-center justify-between" aria-hidden>
            <Skeleton className="h-10 w-56" />
            <Skeleton className="h-10 w-40" />
          </div>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-hidden>
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[104px] rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={250}>
      <div className="flex min-h-dvh flex-col bg-background text-foreground">
        <DashboardHeader onAddPatient={() => setAddOpen(true)} />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
          {children}
        </main>

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
    </TooltipProvider>
  );
}
