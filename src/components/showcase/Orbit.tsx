"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ShowcaseProject } from "@/lib/showcase";
import { KIND_ACTION, KIND_LABEL, categoryColor, kindOf, tileHref } from "@/lib/kind";
import { GHOST_PATH } from "@/components/site/Logo";

type Body = { key: string; name: string; category: string; ring: number; angle: number; size: number; href?: string; thumb: string | null; p?: ShowcaseProject };
const PLACEHOLDERS = [["Games", 0], ["Android apps", 1], ["Websites", 2], ["Experiments", 3]] as const;
const initials = (n: string) => n.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "•";

/** An orbit map of everything published: one ring per category, planets drift around a glowing Wisp. Drag to spin. */
export default function Orbit({ projects }: { projects: ShowcaseProject[] }) {
  const empty = projects.length === 0;
  const { bodies, rings } = useMemo(() => {
    const cats = empty ? PLACEHOLDERS.map(([c]) => c as string) : [...new Set(projects.map((p) => p.category))];
    const ringOf = (c: string) => Math.min(cats.indexOf(c), 4);
    const rings = Math.min(cats.length, 5);
    const per = new Map<number, number>();
    const bodies: Body[] = empty
      ? PLACEHOLDERS.map(([c, i]) => ({ key: c, name: c, category: c, ring: i, angle: (i * Math.PI) / 2 + 0.6, size: 56, thumb: null }))
      : projects.map((p) => {
          const ring = ringOf(p.category), n = per.get(ring) ?? 0; per.set(ring, n + 1);
          return { key: p.id, name: p.name, category: p.category, ring, angle: n * 2.4 + ring * 1.1, size: p.is_featured ? 64 : 50, href: tileHref(p), thumb: p.thumb, p };
        });
    return { bodies, rings };
  }, [projects, empty]);

  const box = useRef<HTMLDivElement>(null);
  const els = useRef<(HTMLElement | null)[]>([]);
  const st = useRef({ spin: 0, vel: 0, drag: false, moved: 0, lastX: 0, hover: false, w: 800, h: 640 });
  const [hot, setHot] = useState<Body | null>(null);

  useEffect(() => {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const s = st.current;
    const size = () => { const r = box.current!.getBoundingClientRect(); s.w = r.width; s.h = r.height; };
    size(); const ro = new ResizeObserver(() => { size(); place(0); }); ro.observe(box.current!);
    let t = 0, last = performance.now(), raf = 0;
    const rad = (ring: number) => (rings > 1 ? 0.2 + ring * (0.26 / (rings - 1)) : 0.3);
    function place(now: number) {
      bodies.forEach((b, i) => {
        const el = els.current[i]; if (!el) return;
        const a = b.angle + (t * (0.16 / (1 + b.ring * 0.55))) + s.spin;
        const rx = rad(b.ring) * s.w, ry = rad(b.ring) * s.h * 0.82;
        el.style.transform = `translate(calc(-50% + ${Math.cos(a) * rx}px), calc(-50% + ${Math.sin(a) * ry}px))`;
        el.style.zIndex = String(10 + Math.round(Math.sin(a) * 5 + 5));
      });
      void now;
    }
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (!s.hover && !s.drag) t += dt;
      if (!s.drag) { s.spin += s.vel * dt; s.vel *= Math.pow(0.04, dt); if (Math.abs(s.vel) < 0.001) s.vel = 0; }
      place(now); raf = requestAnimationFrame(loop);
    };
    place(0);
    if (!reduce) raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [bodies, rings]);

  const down = (e: React.PointerEvent) => { const s = st.current; s.drag = true; s.moved = 0; s.lastX = e.clientX; s.vel = 0; };
  const move = (e: React.PointerEvent) => {
    const s = st.current; if (!s.drag) return;
    const dx = e.clientX - s.lastX; s.lastX = e.clientX; s.moved += Math.abs(dx);
    s.spin += dx * 0.006; s.vel = dx * 0.006 * 60;
  };
  const up = () => { st.current.drag = false; };
  const clickGuard = (e: React.MouseEvent) => { if (st.current.moved > 6) e.preventDefault(); };

  return (
    <section aria-label="Orbit map of creations">
      <div ref={box} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onPointerLeave={up}
        className="relative mx-auto aspect-[1/1.05] w-full max-w-[920px] touch-pan-y select-none overflow-hidden rounded-3xl border border-line bg-surface/40 sm:aspect-[5/4]"
        style={{ backgroundImage: "radial-gradient(60% 60% at 50% 50%, rgb(var(--glow-a) / 0.18), transparent 70%)", cursor: "grab" }}>
        {Array.from({ length: rings }, (_, i) => {
          const r = (rings > 1 ? 0.2 + i * (0.26 / (rings - 1)) : 0.3) * 200;
          return <div key={i} aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 rounded-full border border-dashed border-line" style={{ width: `${r}%`, height: `${r * 0.82}%`, transform: "translate(-50%,-50%)" }} />;
        })}
        <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 z-[5] -translate-x-1/2 -translate-y-1/2">
          <div className="absolute inset-0 -m-6 rounded-full bg-accent/25 blur-2xl" />
          <svg viewBox="0 0 24 24" className="wisp-float relative h-16 w-16 drop-shadow-[0_0_24px_rgb(var(--glow-a)/0.8)] sm:h-20 sm:w-20"><defs><linearGradient id="orb-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#9ccbff" /><stop offset="0.55" stopColor="#5eead4" /><stop offset="1" stopColor="#86efac" /></linearGradient></defs><path d={GHOST_PATH} fill="url(#orb-g)" /><circle cx="9.3" cy="10.4" r="1.35" fill="#06101c" /><circle cx="14.7" cy="10.4" r="1.35" fill="#06101c" /></svg>
        </div>
        {bodies.map((b, i) => {
          const tint = categoryColor(b.category);
          const inner = (
            <>
              <span className="relative grid place-items-center overflow-hidden rounded-full border-2 text-white shadow-lg transition-transform duration-200 group-hover:scale-125 group-focus-visible:scale-125" style={{ width: b.size, height: b.size, borderColor: tint, background: b.thumb ? undefined : `radial-gradient(120% 120% at 25% 15%, color-mix(in srgb, ${tint} 60%, #06101c), #06101c 80%)`, opacity: b.p ? 1 : 0.55, boxShadow: `0 0 28px -4px ${tint}` }}>
                {b.thumb ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={b.thumb} alt="" draggable={false} className="h-full w-full object-cover" /> : <span className="font-display text-sm font-bold">{b.p ? initials(b.name) : "?"}</span>}
              </span>
              <span className="pointer-events-none mt-1 block max-w-[8rem] truncate rounded-full bg-ink/80 px-2 py-0.5 text-center text-[11px] font-medium text-text backdrop-blur">{b.name}</span>
            </>
          );
          const common = { ref: (el: HTMLElement | null) => { els.current[i] = el; }, className: "group absolute left-1/2 top-1/2 flex flex-col items-center outline-offset-4", style: { willChange: "transform" } as React.CSSProperties };
          const on = { onPointerEnter: () => { st.current.hover = true; setHot(b); }, onPointerLeave: () => { st.current.hover = false; }, onFocus: () => { st.current.hover = true; setHot(b); }, onBlur: () => { st.current.hover = false; } };
          return b.href ? (
            b.href.startsWith("/go/")
              ? <a key={b.key} href={b.href} onClick={clickGuard} draggable={false} aria-label={`${b.name}, ${b.category}`} {...common} {...on}>{inner}</a>
              : <Link key={b.key} href={b.href} prefetch={false} onClick={clickGuard} draggable={false} aria-label={`${b.name}, ${b.category}`} {...common} {...on}>{inner}</Link>
          ) : <div key={b.key} aria-label={`${b.name}: opening soon`} {...common} {...on}>{inner}</div>;
        })}
        <p className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-xs text-faint">Drag to spin · hover a planet · click to open</p>
      </div>

      <div className="mx-auto mt-4 min-h-[5.5rem] max-w-[920px] rounded-2xl border border-line bg-surface/60 p-4" aria-live="polite">
        {hot ? (
          <div className="flex items-start gap-3">
            <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: categoryColor(hot.category) }} />
            <div className="min-w-0">
              <p className="font-display text-lg font-bold">{hot.name}</p>
              <p className="text-xs uppercase tracking-[0.12em] text-faint">{hot.p ? `${KIND_LABEL[kindOf(hot.p)]} · ${hot.category}` : "Opening soon"}</p>
              <p className="mt-1 text-sm text-muted">{hot.p ? (hot.p.short_description || KIND_ACTION[kindOf(hot.p)]) : "Nothing here yet. This planet lights up when something is published."}</p>
            </div>
          </div>
        ) : <p className="text-sm text-muted">{empty ? "The universe is still empty. Four planets are waiting for their first creation." : `${projects.length} ${projects.length === 1 ? "creation" : "creations"} in orbit. Hover one to see what it is.`}</p>}
      </div>

      {!empty && (
        <ul className="mx-auto mt-6 grid max-w-[920px] gap-2 sm:grid-cols-2" aria-label="All creations">
          {projects.map((p) => <li key={p.id}><Link href={`/p/${p.slug}`} prefetch={false} className="card flex items-center gap-3 p-3 hover:border-accent/60"><span className="h-2 w-2 rounded-full" style={{ background: categoryColor(p.category) }} /><span className="font-medium">{p.name}</span><span className="ml-auto text-xs text-faint">{p.category}</span></Link></li>)}
        </ul>
      )}
    </section>
  );
}
