import { AnkleIcon, KneeIcon, ShoulderIcon, SpineIcon } from "./anatomy-art";

const AREAS = [
  {
    Icon: SpineIcon,
    title: "Spine & Posture",
    copy: "Back pain, slipped discs, posture correction — rebuilding the column that holds everything up.",
  },
  {
    Icon: ShoulderIcon,
    title: "Shoulder",
    copy: "Frozen shoulder, rotator-cuff rehab, impingement — restoring reach, lift, and pain-free motion.",
  },
  {
    Icon: KneeIcon,
    title: "Knee",
    copy: "Post-injury and post-surgical rehab, arthritis care — steady steps back to strong, stable knees.",
  },
  {
    Icon: AnkleIcon,
    title: "Foot & Ankle",
    copy: "Sprains, plantar fasciitis, balance training — because recovery starts from the ground up.",
  },
];

/** "The anatomy of care" — joint line-art cards, the bone motifs. */
export function CareAreas() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16 sm:py-20" aria-labelledby="care-heading">
      <div className="anim-page-enter mx-auto max-w-2xl text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Areas of care</p>
        <h2 id="care-heading" className="mt-4 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          The anatomy of care
        </h2>
        <p className="mt-4 text-pretty text-[17px] leading-relaxed text-muted-foreground">
          Every joint has its own story. Here are the ones we help rewrite, every single day.
        </p>
      </div>

      <div className="anim-stagger mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {AREAS.map(({ Icon, title, copy }) => (
          <article
            key={title}
            className="anim-card-enter group relative overflow-hidden rounded-2xl border border-border bg-card p-7 shadow-soft transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-lift"
          >
            <div className="dot-grid pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-40" aria-hidden />
            <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110" aria-hidden>
              <Icon className="h-8 w-8" />
            </span>
            <h3 className="relative mt-5 font-display text-xl font-semibold tracking-tight text-foreground">{title}</h3>
            <p className="relative mt-2.5 text-[15px] leading-relaxed text-muted-foreground">{copy}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
