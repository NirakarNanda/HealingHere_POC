/**
 * Anatomical line-art — the "bone motifs" of the landing page.
 * Hand-drawn SVG: a vertebral column that draws itself, plus minimal
 * joint icons (knee, shoulder, spine, ankle) for the care-area cards.
 * Stroke-based, theme-aware, decorative (aria-hidden).
 */

const VERTEBRAE = [
  { y: 70, x: 160, w: 34, h: 20 }, // cervical
  { y: 108, x: 167, w: 36, h: 20 },
  { y: 146, x: 174, w: 38, h: 21 }, // C7
  { y: 190, x: 181, w: 44, h: 22 }, // thoracic
  { y: 238, x: 184, w: 48, h: 22 }, // T7
  { y: 286, x: 180, w: 52, h: 23 },
  { y: 338, x: 171, w: 58, h: 24 }, // lumbar
  { y: 390, x: 162, w: 62, h: 24 }, // L4
  { y: 442, x: 155, w: 64, h: 24 }, // L5
] as const;

const MARKERS = [
  { cx: 207, cy: 146, label: "Cervical", lx: 224, ly: 150, delay: "1.35s" },
  { cx: 222, cy: 238, label: "Thoracic", lx: 239, ly: 242, delay: "1.5s" },
  { cx: 207, cy: 390, label: "Lumbar", lx: 224, ly: 394, delay: "1.65s" },
] as const;

export function SpineArt({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 340 600"
      fill="none"
      role="img"
      aria-label="Stylised illustration of a human spine"
      className={className}
    >
      <defs>
        <radialGradient id="spineGlow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.16" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Backdrop — chart rings + glow */}
      <circle cx="170" cy="300" r="135" fill="url(#spineGlow)" />
      <circle cx="170" cy="300" r="208" stroke="hsl(var(--primary))" strokeOpacity="0.28" strokeWidth="1.5" strokeDasharray="2 9" />
      <circle cx="170" cy="300" r="152" stroke="hsl(var(--primary))" strokeOpacity="0.18" strokeWidth="1.5" strokeDasharray="2 9" />

      {/* Spinal cord line — draws itself */}
      <path
        className="spine-draw"
        d="M160 42 C165 75 170 95 174 120 C178 150 184 175 185 210 C186 245 184 275 179 310 C174 345 166 375 161 410 C157 440 153 470 154 505"
        stroke="hsl(var(--primary))"
        strokeOpacity="0.85"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* Vertebrae — settle in top to bottom */}
      {VERTEBRAE.map((v, i) => (
        <g key={v.y} className="vertebra" style={{ animationDelay: `${0.5 + i * 0.08}s` }}>
          <rect
            x={v.x - v.w / 2}
            y={v.y - v.h / 2}
            width={v.w}
            height={v.h}
            rx={v.h / 2 - 2}
            stroke="hsl(var(--primary))"
            strokeOpacity="0.9"
            strokeWidth="2"
            fill="hsl(var(--primary) / 0.07)"
          />
          {/* transverse process ticks */}
          <line x1={v.x - v.w / 2 - 7} y1={v.y} x2={v.x - v.w / 2 - 1} y2={v.y} stroke="hsl(var(--primary))" strokeOpacity="0.45" strokeWidth="1.5" strokeLinecap="round" />
          <line x1={v.x + v.w / 2 + 1} y1={v.y} x2={v.x + v.w / 2 + 7} y2={v.y} stroke="hsl(var(--primary))" strokeOpacity="0.45" strokeWidth="1.5" strokeLinecap="round" />
        </g>
      ))}

      {/* Sacrum */}
      <path
        className="vertebra"
        style={{ animationDelay: "1.25s" }}
        d="M138 474 L170 474 L162 540 Q158 552 150 552 Q142 552 138 540 Z"
        stroke="hsl(var(--primary))"
        strokeOpacity="0.9"
        strokeWidth="2"
        strokeLinejoin="round"
        fill="hsl(var(--primary) / 0.07)"
      />

      {/* Region markers */}
      {MARKERS.map((m) => (
        <g key={m.label} className="joint-marker" style={{ animationDelay: m.delay }}>
          <circle cx={m.cx} cy={m.cy} r="5" stroke="hsl(var(--primary))" strokeOpacity="0.5" strokeWidth="1.5" className="marker-ping" />
          <circle cx={m.cx} cy={m.cy} r="4" fill="hsl(var(--primary))" />
          <line x1={m.cx + 8} y1={m.cy} x2={m.lx - 6} y2={m.cy} stroke="hsl(var(--primary))" strokeOpacity="0.4" strokeWidth="1.5" />
          <text
            x={m.lx}
            y={m.ly}
            fontSize="12"
            fontWeight="600"
            letterSpacing="2"
            fill="hsl(var(--muted-foreground))"
            style={{ fontFamily: "inherit" }}
          >
            {m.label.toUpperCase()}
          </text>
        </g>
      ))}
    </svg>
  );
}

/* ---------- Joint icons (24px line-art) ---------- */

function JointSvg({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      {children}
    </svg>
  );
}

export function KneeIcon({ className }: { className?: string }) {
  return (
    <JointSvg className={className}>
      <path d="M9.5 3v5.2" />
      <path d="M14.5 3v5.2" />
      <circle cx="9.5" cy="10.4" r="2.1" />
      <circle cx="14.5" cy="10.4" r="2.1" />
      <path d="M7 15.6h10" />
      <path d="M10.3 15.6V21" />
      <path d="M13.7 15.6V21" />
    </JointSvg>
  );
}

export function ShoulderIcon({ className }: { className?: string }) {
  return (
    <JointSvg className={className}>
      <path d="M3.5 5.5h7" />
      <path d="M10.5 5.5c2.8 0 4.8 1.8 5.4 4.6" />
      <circle cx="12.5" cy="14.6" r="3.1" />
      <path d="M12.5 17.7V21.5" />
    </JointSvg>
  );
}

export function SpineIcon({ className }: { className?: string }) {
  return (
    <JointSvg className={className}>
      <rect x="9.2" y="3" width="5.6" height="3.2" rx="1.6" />
      <rect x="8.4" y="8.6" width="7.2" height="3.4" rx="1.7" />
      <rect x="9.2" y="14.4" width="5.6" height="3.2" rx="1.6" />
      <path d="M10.4 19.4l1.6 2.3 1.6-2.3" />
    </JointSvg>
  );
}

export function AnkleIcon({ className }: { className?: string }) {
  return (
    <JointSvg className={className}>
      <path d="M10 3v9.5" />
      <path d="M14 3v8.5" />
      <circle cx="12" cy="14.6" r="2.3" />
      <path d="M10.1 16.5c-1.7.7-2.5 1.9-2.3 3.4.1 1 1 1.7 2 1.7H19" />
    </JointSvg>
  );
}
