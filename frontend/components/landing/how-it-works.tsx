import { CloudUpload, UserPlus, WifiOff } from "lucide-react";

const STEPS = [
  {
    n: "01",
    Icon: UserPlus,
    title: "Add the patient",
    copy: "Name, phone, complaint — captured in seconds on the iPad. The record is saved to the device instantly.",
  },
  {
    n: "02",
    Icon: WifiOff,
    title: "Keep working offline",
    copy: "Internet down? Nothing changes. Search, add, and review records — everything stays on the device.",
  },
  {
    n: "03",
    Icon: CloudUpload,
    title: "Sync takes care of itself",
    copy: "The moment you're back online, records flow to the database and on to Google Sheets. No taps, no exports.",
  },
];

/** The offline-first flow, told as a three-step story. */
export function HowItWorks() {
  return (
    <section id="how-it-works" className="border-y border-border bg-card/50" aria-labelledby="how-heading" >
      <div className="mx-auto max-w-6xl scroll-mt-20 px-6 py-16 sm:py-20">
        <div className="anim-page-enter mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">How it works</p>
          <h2 id="how-heading" className="mt-4 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Charting, minus the paperwork
          </h2>
          <p className="mt-4 text-pretty text-[17px] leading-relaxed text-muted-foreground">
            Built for the pace of a real clinic — open, tap, save, move on to the next patient.
          </p>
        </div>

        <ol className="anim-stagger relative mt-12 grid gap-10 md:grid-cols-3 md:gap-6">
          {/* connecting thread */}
          <div className="pointer-events-none absolute left-[16%] right-[16%] top-7 hidden border-t-2 border-dashed border-primary/30 md:block" aria-hidden />
          {STEPS.map(({ n, Icon, title, copy }) => (
            <li key={n} className="anim-card-enter relative text-center md:text-left">
              <div className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/25 bg-background text-primary shadow-soft md:mx-0" aria-hidden>
                <Icon className="h-6 w-6" />
              </div>
              <p className="mt-5 font-display text-sm font-semibold tracking-[0.25em] text-primary/70">{n}</p>
              <h3 className="mt-1.5 text-lg font-semibold tracking-tight text-foreground">{title}</h3>
              <p className="mx-auto mt-2.5 max-w-sm text-[15px] leading-relaxed text-muted-foreground md:mx-0">{copy}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
