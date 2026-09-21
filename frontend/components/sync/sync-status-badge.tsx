import { AlertTriangle, Check, Clock, RefreshCw } from "lucide-react";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import type { SyncStatus } from "@/types/patient";
import { cn } from "@/lib/utils";

const CONFIG: Record<SyncStatus, { label: string; variant: BadgeProps["variant"]; Icon: typeof Clock; spin: boolean }> = {
  PENDING: { label: "◷ Pending", variant: "pending", Icon: Clock, spin: false },
  SYNCING: { label: "↻ Syncing", variant: "syncing", Icon: RefreshCw, spin: true },
  SYNCED: { label: "✓ Synced", variant: "success", Icon: Check, spin: false },
  FAILED: { label: "! Failed", variant: "failed", Icon: AlertTriangle, spin: false },
};

/**
 * Sync status badge — always icon + text, never colour alone.
 * aria-live so screen readers hear sync transitions.
 */
export function SyncStatusBadge({ status, className }: { status: SyncStatus; className?: string }) {
  const { label, variant, Icon, spin } = CONFIG[status];
  return (
    <Badge variant={variant} className={cn("whitespace-nowrap", className)} aria-live="polite">
      <Icon className={cn("h-3.5 w-3.5", spin && "animate-spin")} aria-hidden />
      <span>{label}</span>
    </Badge>
  );
}
