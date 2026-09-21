import Link from "next/link";
import { ArrowRight, ChevronDown, ShieldCheck, TabletSmartphone, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SpineArt } from "./anatomy-art";

const TRUST = [
  { Icon: ShieldCheck, label: "Offline-first records" },
  { Icon: TabletSmartphone, label: "iPad-ready" },
  { Icon: RefreshCw, label: "Auto-sync to Sheets" },
];

/**
 * Hero — editorial split: serif headline + self-drawing spine.
 * The spine is the clinic's signature motif: structure, alignment, recovery.
 */
export function Hero() {
  return (
    <section className="relative overflow-hidden" aria-labelledby="hero-heading">
      {/* faint dotted chart backdrop */}
      <div className="dot-grid pointer-events-none absolute inset-0 opacity-60 [mask-image:radial-gradient(70%_60%_at_50%_35%,black,transparent)]" aria-hidden />

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 pb-16 pt-16 sm:pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-6 lg:pb-24 lg:pt-24">
        {/* Copy */}
        <div className="text-center lg:text-left">
          <p className="anim-page-enter inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-[13px] font-semibold tracking-wide text-muted-foreground shadow-soft">
            <span className="relative flex h-2 w-2" aria-hidden>
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            Bijayalakshmi Physiotherapy Clinic · Dr. Abhilash Nanda
          </p>

          <h1
            id="hero-heading"
            className="anim-page-enter mt-6 font-display text-5xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-6xl lg:text-[4.2rem]"
            style={{ animationDelay: "0.08s" }}
          >
            Restoring Movement.
            <br />
            <em className="text-primary">Rebuilding</em> Confidence.
          </h1>

          <p
            className="anim-page-enter mx-auto mt-6 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground lg:mx-0"
            style={{ animationDelay: "0.16s" }}
          >
            Thoughtful, personalised physiotherapy — from spine to ankle —
            with patient records as carefully looked after as the patients themselves.
          </p>

          <div
            className="anim-page-enter mt-9 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start"
            style={{ animationDelay: "0.24s" }}
          >
            <Button asChild size="lg" className="h-12 w-full px-7 text-base sm:w-auto">
              <Link href="/login">
                Doctor Login
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 w-full px-7 text-base sm:w-auto">
              <a href="#how-it-works">
                How it works
                <ChevronDown className="h-4 w-4" aria-hidden />
              </a>
            </Button>
          </div>

          <ul
            className="anim-page-enter mt-10 flex flex-wrap items-center justify-center gap-x-7 gap-y-3 text-sm font-medium text-muted-foreground lg:justify-start"
            style={{ animationDelay: "0.32s" }}
          >
            {TRUST.map(({ Icon, label }) => (
              <li key={label} className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-primary" aria-hidden />
                {label}
              </li>
            ))}
          </ul>
        </div>

        {/* Spine art */}
        <div className="anim-page-enter relative mx-auto w-full max-w-[420px]" style={{ animationDelay: "0.2s" }}>
          <div className="relative overflow-hidden rounded-[2rem] border border-border bg-card/60 shadow-lift">
            <div className="dot-grid absolute inset-0 opacity-50" aria-hidden />
            <SpineArt className="relative mx-auto h-[480px] w-auto py-6 sm:h-[540px]" />
            {/* caption */}
            <p className="relative border-t border-border bg-card/80 px-6 py-3 text-center text-[13px] tracking-wide text-muted-foreground backdrop-blur-sm">
              The vertebral column — <span className="font-semibold text-foreground">33 reasons</span> to keep moving
            </p>
          </div>
          {/* floating chip */}
          <div className="absolute -right-2 top-8 hidden rotate-3 rounded-xl border border-border bg-card px-4 py-2.5 text-[13px] font-semibold text-foreground shadow-lift sm:block" aria-hidden>
            Alignment matters
          </div>
          <div className="absolute -left-3 bottom-24 hidden -rotate-2 rounded-xl border border-border bg-card px-4 py-2.5 text-[13px] font-semibold text-foreground shadow-lift sm:block" aria-hidden>
            Recovery, by design
          </div>
        </div>
      </div>
    </section>
  );
}
