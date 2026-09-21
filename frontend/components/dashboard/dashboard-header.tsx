"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Activity, LayoutDashboard, LogOut, Plus, RefreshCw, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme-toggle";
import { OfflineIndicator } from "@/components/dashboard/offline-indicator";
import { authApi } from "@/lib/api/client";
import { useSync } from "@/hooks/use-sync";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/patients", label: "Patient Records", Icon: Users },
];

/** Sync Now button — shows progress state, summarizes after sync. */
export function SyncButton() {
  const { syncing, syncNow } = useSync();
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void syncNow()}
          disabled={syncing}
          aria-live="polite"
          className="h-11"
        >
          <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} aria-hidden />
          <span className="hidden sm:inline">{syncing ? "Syncing…" : "Sync Now"}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>Sync pending records now</TooltipContent>
    </Tooltip>
  );
}

/** Authenticated app header: branding, nav, actions, connectivity, theme. */
export function DashboardHeader({ onAddPatient }: { onAddPatient: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { online } = useSync();

  async function handleLogout() {
    try {
      await authApi.logout();
    } catch {
      // Session already gone — still head to login.
    } finally {
      toast.success("Logged out");
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-[72px] max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Link href="/dashboard" className="flex min-w-0 items-center gap-3 rounded-md" aria-label="Bijayalakshmi Physiotherapy — home">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-soft" aria-hidden>
            <Activity className="h-5 w-5" />
          </span>
          <span className="hidden min-w-0 md:block">
            <span className="block truncate text-[15px] font-semibold leading-tight text-foreground">
              Bijayalakshmi Physiotherapy
            </span>
            <span className="block text-xs text-muted-foreground">Dr. Abhilash Nanda</span>
          </span>
        </Link>

        <nav aria-label="Primary" className="ml-2 hidden items-center gap-1 lg:flex">
          {NAV.map(({ href, label, Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-11 items-center gap-2 rounded-md px-4 text-sm font-medium transition-colors duration-200",
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <OfflineIndicator online={online} className="hidden md:inline-flex" />
          <SyncButton />
          <Button size="sm" onClick={onAddPatient} className="h-11">
            <Plus className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">Add Patient</span>
            <span className="sr-only sm:hidden">Add patient</span>
          </Button>
          <Separator orientation="vertical" className="mx-1 h-6" />
          <ThemeToggle />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => void handleLogout()} aria-label="Log out">
                <LogOut className="h-5 w-5" aria-hidden />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Log out</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Mobile nav — large touch targets, no hover dependence */}
      <nav aria-label="Primary" className="border-t border-border lg:hidden">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-1 px-4 py-2 sm:px-6">
          {NAV.map(({ href, label, Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-12 items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors duration-200",
                  active ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                )}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
