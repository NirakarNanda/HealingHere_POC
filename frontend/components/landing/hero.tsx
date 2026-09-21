import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Hero — headline + elegant supporting copy + motion motif.
 * The flowing SVG line suggests human posture and movement in recovery.
 */
export function Hero() {
  return (
    <section className="relative overflow-hidden" aria-labelledby="hero-heading">
      {/* Abstract motion motif — decorative only */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 1440 720"
          preserveAspectRatio="xMidYMid slice"
          fill="none"
        >
          <defs>
            <linearGradient id="flowA" x1="0" y1="0" x2="1440" y2="0" gradientUnits="userSpaceOnUse">
              <stop stopColor="hsl(var(--primary))" stopOpacity="0" />
              <stop offset="0.45" stopColor="hsl(var(--primary))" stopOpacity="0.5" />
              <stop offset="0.8" stopColor="hsl(var(--primary))" stopOpacity="0.12" />
              <stop offset="1" stopColor="hsl(var(--primary))" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="flowB" x1="0" y1="0" x2="1440" y2="0" gradientUnits="userSpaceOnUse">
              <stop stopColor="hsl(var(--primary))" stopOpacity="0" />
              <stop offset="0.6" stopColor="hsl(var(--primary))" stopOpacity="0.28" />
              <stop offset="1" stopColor="hsl(var(--primary))" stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* Primary flow — rising arc like a body in motion */}
          <path
            className="flow-line"
            d="M-40 560 C 220 540, 340 380, 560 400 S 900 620, 1120 480 S 1380 220, 1500 260"
            stroke="url(#flowA)"
            strokeWidth="3"
            strokeLinecap="round"
          />
          {/* Secondary flow — gentle counter-curve */}
          <path
            className="flow-line-slow"
            d="M-40 640 C 260 620, 420 500, 640 540 S 1000 660, 1220 560 S 1400 420, 1500 440"
            stroke="url(#flowB)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          {/* Node accents — points along the recovery path */}
          <circle cx="560" cy="400" r="5" fill="hsl(var(--primary))" opacity="0.55" className="animate-drift" />
          <circle cx="1120" cy="480" r="4" fill="hsl(var(--primary))" opacity="0.4" className="animate-drift" style={{ animationDelay: "2.4s" }} />
          <circle cx="640" cy="540" r="3" fill="hsl(var(--primary))" opacity="0.32" className="animate-drift" style={{ animationDelay: "4.8s" }} />
        </svg>
        {/* Soft wash so text stays calm */}
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(60% 50% at 50% 30%, hsl(var(--hero-glow) / 0.14), transparent 70%)" }}
        />
      </div>

      <div className="relative mx-auto max-w-4xl px-6 pb-20 pt-24 text-center sm:pb-28 sm:pt-32">
        <p className="anim-page-enter text-sm font-semibold uppercase tracking-[0.2em] text-primary">
          Bijayalakshmi Physiotherapy
        </p>
        <h1
          id="hero-heading"
          className="anim-page-enter mt-5 text-balance text-4xl font-semibold leading-[1.1] tracking-tight text-foreground sm:text-5xl md:text-6xl"
          style={{ animationDelay: "0.08s" }}
        >
          Restoring Movement.
          <br />
          Rebuilding Confidence.
        </h1>
        <p
          className="anim-page-enter mx-auto mt-6 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground"
          style={{ animationDelay: "0.16s" }}
        >
          Thoughtful, personalised physiotherapy care for every stage of recovery —
          guided by Dr.&nbsp;Abhilash Nanda.
        </p>
        <div className="anim-page-enter mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row" style={{ animationDelay: "0.24s" }}>
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href="/login">
              Doctor Login
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
