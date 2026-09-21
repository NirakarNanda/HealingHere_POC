import { CloudOff, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Subtle connectivity pill. Offline is informative, never an alarming error.
 */
export function OfflineIndicator({ online, className }: { online: boolean; className?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all duration-300",
        online
          ? "border-border bg-muted/60 text-muted-foreground"
          : "border-[hsl(var(--amber)/0.35)] bg-[hsl(var(--amber-soft))] text-[hsl(var(--amber))]",
        className
      )}
    >
      <span className="relative flex h-2 w-2">
        <span
          className={cn(
            "absolute inline-flex h-full w-full rounded-full opacity-60",
            online ? "bg-[hsl(var(--success))]" : "bg-[hsl(var(--amber))]",
            online && "animate-ping"
          )}
          aria-hidden
        />
        <span
          className={cn(
            "relative inline-flex h-2 w-2 rounded-full",
            online ? "bg-[hsl(var(--success))]" : "bg-[hsl(var(--amber))]"
          )}
          aria-hidden
        />
      </span>
      {online ? (
        <>
          <Wifi className="h-3.5 w-3.5" aria-hidden />
          <span>Online</span>
        </>
      ) : (
        <>
          <CloudOff className="h-3.5 w-3.5" aria-hidden />
          <span className="hidden sm:inline">Offline — changes are safely stored on this device</span>
          <span className="sm:hidden">Offline — saved on this device</span>
        </>
      )}
    </div>
  );
}
