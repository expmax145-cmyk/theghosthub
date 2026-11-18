"use client";
import Link from "next/link";
import AskWisp from "./AskWisp";

const DOORS = [
  { label: "Games", note: "Play in your browser, no install.", tint: "#4da3ff", icon: <><rect x="3" y="8" width="18" height="10" rx="5" /><path d="M8 11v4M6 13h4M16 12h.01M18 14h.01" /></> },
  { label: "Android apps", note: "Install straight from an APK.", tint: "#4ade80", icon: <><rect x="7" y="2.5" width="10" height="19" rx="2.5" /><path d="M11 18.5h2" /></> },
  { label: "Websites", note: "Live sites, one tap away.", tint: "#2dd4cf", icon: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18" /></> },
  { label: "Experiments", note: "AI toys and weird prototypes.", tint: "#7cb8ff", icon: <><path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 18l-5-9V3" /><path d="M7.5 15h9" /></> },
];

/** Shown while nothing is published: four doors that tilt toward the pointer, "opening soon". */
export default function ComingSoon() {
  const tilt = (e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType !== "mouse" || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = e.currentTarget, r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    el.style.setProperty("--ry", `${(x - 0.5) * 12}deg`); el.style.setProperty("--rx", `${(0.5 - y) * 12}deg`);
    el.style.setProperty("--mx", `${x * 100}%`); el.style.setProperty("--my", `${y * 100}%`);
  };
  const rest = (e: React.PointerEvent<HTMLElement>) => { e.currentTarget.style.setProperty("--rx", "0deg"); e.currentTarget.style.setProperty("--ry", "0deg"); };
  return (
    <div>
      <div className="mb-6 text-center" data-reveal>
        <p className="font-display text-2xl font-bold sm:text-3xl">The doors are still closed.</p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">Wisp is warming up the first creations. Each door opens here the moment something is published.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {DOORS.map((d, i) => (
          <div key={d.label} data-reveal style={{ ["--d" as string]: `${i * 90}ms`, ["--tint" as string]: d.tint }}>
            <article onPointerMove={tilt} onPointerLeave={rest} className="door relative flex aspect-[4/5] flex-col justify-between overflow-hidden rounded-2xl border border-line bg-surface p-4 sm:p-5">
              <div className="door-glow pointer-events-none absolute inset-0" aria-hidden="true" />
              <svg viewBox="0 0 24 24" className="relative h-10 w-10 sm:h-12 sm:w-12" fill="none" stroke={d.tint} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d.icon}</svg>
              <div className="relative">
                <span className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted"><span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: d.tint }} />Opening soon</span>
                <h3 className="font-display text-lg font-bold sm:text-xl">{d.label}</h3>
                <p className="mt-1 text-xs leading-snug text-muted sm:text-[13px]">{d.note}</p>
              </div>
            </article>
          </div>
        ))}
      </div>
      <div className="mt-8 flex flex-wrap justify-center gap-3" data-reveal>
        <AskWisp label="Ask Wisp while you wait ✦" primary />
      </div>
      <p className="mt-6 text-center text-sm text-muted" data-reveal>Want to know when it opens? <Link href="/contact" className="font-medium text-accent underline-offset-4 hover:underline">Say hello</Link>.</p>
    </div>
  );
}
