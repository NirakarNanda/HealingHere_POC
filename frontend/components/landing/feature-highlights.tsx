import { HeartHandshake, PersonStanding, TrendingUp } from "lucide-react";

const FEATURES = [
  {
    Icon: HeartHandshake,
    title: "Personalized Care",
    copy: "Every treatment plan is shaped around the person in front of us — their body, their goals, their pace.",
  },
  {
    Icon: PersonStanding,
    title: "Movement & Recovery",
    copy: "Hands-on physiotherapy that restores natural movement, posture, and strength after injury or pain.",
  },
  {
    Icon: TrendingUp,
    title: "Progress-Focused Treatment",
    copy: "Clear milestones and careful follow-up, so recovery is something you can see and feel.",
  },
];

/** Three quiet feature cards — trust, not marketing noise. */
export function FeatureHighlights() {
  return (
    <section className="mx-auto max-w-6xl px-6 pb-24" aria-label="What the clinic offers">
      <div className="anim-stagger grid gap-5 md:grid-cols-3">
        {FEATURES.map(({ Icon, title, copy }) => (
          <article
            key={title}
            className="anim-card-enter rounded-lg border border-border bg-card p-7 shadow-soft transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lift"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary" aria-hidden>
              <Icon className="h-6 w-6" />
            </span>
            <h2 className="mt-5 text-lg font-semibold tracking-tight text-foreground">{title}</h2>
            <p className="mt-2.5 text-[15px] leading-relaxed text-muted-foreground">{copy}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
