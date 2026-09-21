import Link from "next/link";
import { Activity } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Hero } from "@/components/landing/hero";
import { FeatureHighlights } from "@/components/landing/feature-highlights";
import { Separator } from "@/components/ui/separator";

export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-3 rounded-md" aria-label="Bijayalakshmi Physiotherapy — home">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-soft" aria-hidden>
            <Activity className="h-5 w-5" />
          </span>
          <span className="leading-tight">
            <span className="block text-[15px] font-semibold tracking-tight">Bijayalakshmi Physiotherapy</span>
            <span className="block text-xs text-muted-foreground">Dr. Abhilash Nanda</span>
          </span>
        </Link>
        <ThemeToggle />
      </header>

      <main className="flex-1">
        <Hero />
        <FeatureHighlights />
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-6 py-6 text-sm text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} Bijayalakshmi Physiotherapy</p>
          <Separator orientation="vertical" className="hidden h-4 sm:block" />
          <p className="text-[13px]">Care by Dr. Abhilash Nanda · Restoring movement, rebuilding confidence</p>
        </div>
      </footer>
    </div>
  );
}
