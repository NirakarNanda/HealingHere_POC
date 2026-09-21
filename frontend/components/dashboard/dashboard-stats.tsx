"use client";

import { AlertTriangle, CalendarPlus, Clock, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { PatientCounts } from "@/hooks/use-patients";

const STATS = [
  { key: "total", label: "Total Patients", Icon: Users, tone: "text-primary" },
  { key: "addedToday", label: "Added Today", Icon: CalendarPlus, tone: "text-[hsl(var(--blue))]" },
  { key: "pending", label: "Pending Sync", Icon: Clock, tone: "text-[hsl(var(--amber))]" },
  { key: "failed", label: "Failed Sync", Icon: AlertTriangle, tone: "text-destructive" },
] as const;

/** Compact, elegant dashboard statistics — local data only. */
export function DashboardStats({ counts }: { counts: PatientCounts | undefined }) {
  if (!counts) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-hidden>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[104px] rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="anim-stagger grid grid-cols-2 gap-4 lg:grid-cols-4">
      {STATS.map(({ key, label, Icon, tone }) => (
        <Card key={key} className="anim-card-enter overflow-hidden">
          <CardContent className="flex items-center gap-4 p-5">
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted"
              aria-hidden
            >
              <Icon className={`h-5 w-5 ${tone}`} />
            </span>
            <div className="min-w-0">
              <p className="text-2xl font-semibold tabular-nums leading-none text-foreground">
                {counts[key]}
              </p>
              <p className="mt-1.5 truncate text-[13px] text-muted-foreground">{label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
