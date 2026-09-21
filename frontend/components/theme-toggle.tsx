"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/** Polished light/dark toggle. Keyboard accessible, tooltip-labelled. */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          onClick={() => setTheme(isDark ? "light" : "dark")}
          className={cn(
            "relative h-11 w-11 rounded-full text-muted-foreground transition-all duration-300 hover:bg-accent hover:text-accent-foreground",
            className
          )}
        >
          {/* Render a stable placeholder until mounted to avoid hydration flash */}
          {mounted ? (
            <span key={isDark ? "moon" : "sun"} className="animate-scale-in">
              {isDark ? <Moon className="h-5 w-5" aria-hidden /> : <Sun className="h-5 w-5" aria-hidden />}
            </span>
          ) : (
            <span className="h-5 w-5" aria-hidden />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {isDark ? "Switch to light mode" : "Switch to dark mode"}
      </TooltipContent>
    </Tooltip>
  );
}
