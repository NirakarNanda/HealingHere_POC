import Link from "next/link";
import { ArrowRight, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Doctor banner — monogram, name, and the way in. */
export function DoctorBanner() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16 sm:py-20" aria-labelledby="doctor-heading">
      <div className="anim-page-enter relative overflow-hidden rounded-[2rem] border border-border bg-card shadow-lift">
        <div className="dot-grid pointer-events-none absolute inset-0 opacity-50" aria-hidden />
        <div className="relative grid items-center gap-8 p-8 sm:p-12 lg:grid-cols-[auto_1fr_auto]">
          <span
            className="flex h-20 w-20 items-center justify-center rounded-3xl bg-primary font-display text-2xl font-semibold text-primary-foreground shadow-soft"
            aria-hidden
          >
            AN
          </span>
          <div className="text-center lg:text-left">
            <p className="flex items-center justify-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-primary lg:justify-start">
              <Stethoscope className="h-4 w-4" aria-hidden />
              Meet your doctor
            </p>
            <h2 id="doctor-heading" className="mt-3 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Dr. Abhilash Nanda
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-pretty text-[16px] leading-relaxed text-muted-foreground lg:mx-0">
              Physiotherapist at Bijayalakshmi Physiotherapy — pairing hands-on clinical
              expertise with records that never get lost, rained on, or left in a drawer.
            </p>
          </div>
          <Button asChild size="lg" className="h-12 justify-self-center px-7 text-base lg:justify-self-end">
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
