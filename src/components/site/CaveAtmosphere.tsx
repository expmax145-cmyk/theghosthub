"use client";
import { useEffect, useRef, useState } from "react";
import { haptic, lightsOn, reducedMotion, screech, soundOn, startAmbience, unlock } from "@/lib/cave";

/**
 * The always-on cave layer: stone and fog behind the page, a flashlight that follows the pointer,
 * a depth gauge that tracks scrolling, achievement toasts and the bat swarm. All of it is decorative
 * (aria-hidden, pointer-events none) and switches off for reduced-motion visitors.
 */
export default function CaveAtmosphere() {
  const gauge = useRef<HTMLDivElement>(null);
  const [depthM, setDepthM] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const swarm = useRef<HTMLCanvasElement>(null);

  // Preferences restored after hydration so server and client markup match.
  useEffect(() => {
    if (lightsOn()) document.documentElement.setAttribute("data-lights", "1");
    if (soundOn()) {
      // Browsers only allow audio after a gesture, so resume ambience on the first interaction.
      const go = () => { startAmbience(); window.removeEventListener("pointerdown", go); window.removeEventListener("keydown", go); };
      window.addEventListener("pointerdown", go, { once: true });
      window.addEventListener("keydown", go, { once: true });
      return () => { window.removeEventListener("pointerdown", go); window.removeEventListener("keydown", go); };
    }
  }, []);

  // Flashlight position, logo-eye tracking and scroll depth.
  useEffect(() => {
    const root = document.documentElement;
    const calm = reducedMotion();
    let raf = 0;
    let lx = window.innerWidth / 2, ly = window.innerHeight * 0.4;
    const paint = () => {
      raf = 0;
      root.style.setProperty("--lx", `${lx}px`);
      root.style.setProperty("--ly", `${ly}px`);
      const eyes = document.querySelector<HTMLElement>("[data-logo-eyes]");
      if (eyes && !calm) {
        const r = eyes.getBoundingClientRect();
        const dx = Math.max(-1, Math.min(1, (lx - (r.left + r.width / 2)) / 300));
        const dy = Math.max(-1, Math.min(1, (ly - (r.top + r.height / 2)) / 300));
        eyes.style.setProperty("--ex", `${(dx * 2.2).toFixed(2)}px`);
        eyes.style.setProperty("--ey", `${(dy * 1.4).toFixed(2)}px`);
      }
    };
    const queue = () => { if (!raf) raf = requestAnimationFrame(paint); };
    const move = (e: PointerEvent) => { lx = e.clientX; ly = e.clientY; queue(); };
    const scroll = () => {
      const max = Math.max(1, root.scrollHeight - window.innerHeight);
      const p = Math.min(1, Math.max(0, window.scrollY / max));
      root.style.setProperty("--sy", String(Math.round(window.scrollY)));
      root.style.setProperty("--depth", p.toFixed(3));
      if (gauge.current) gauge.current.style.setProperty("--p", `${(p * 100).toFixed(1)}%`);
      setDepthM(Math.round(p * 120));
      if (p > 0.985 && max > window.innerHeight * 0.8) unlock("depth");
    };
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerdown", move, { passive: true });
    window.addEventListener("scroll", scroll, { passive: true });
    window.addEventListener("resize", scroll);
    paint(); scroll();
    const again = window.setTimeout(scroll, 800); // page height settles after content loads
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", move);
      window.removeEventListener("scroll", scroll);
      window.removeEventListener("resize", scroll);
      window.clearTimeout(again);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // Achievement toasts.
  useEffect(() => {
    let t = 0;
    const on = (e: Event) => {
      setToast((e as CustomEvent<string>).detail);
      window.clearTimeout(t);
      t = window.setTimeout(() => setToast(null), 4200);
    };
    window.addEventListener("ghost-ach", on);
    return () => { window.removeEventListener("ghost-ach", on); window.clearTimeout(t); };
  }, []);

  // Bat swarm: a short stampede of silhouettes across the whole screen.
  useEffect(() => {
    let running = false;
    const run = () => {
      const c = swarm.current;
      if (!c || running || reducedMotion()) return;
      running = true;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const W = (c.width = window.innerWidth * dpr), H = (c.height = window.innerHeight * dpr);
      const g = c.getContext("2d");
      if (!g) { running = false; return; }
      const N = window.innerWidth < 640 ? 26 : 44;
      const bats = Array.from({ length: N }, () => ({
        x: -Math.random() * W * 0.5, y: Math.random() * H,
        vx: (2.2 + Math.random() * 3.4) * dpr, vy: (Math.random() - 0.5) * 1.6 * dpr,
        s: (0.5 + Math.random() * 1.1) * dpr, ph: Math.random() * 6.28,
      }));
      screech(); haptic([40, 40, 80, 40, 140]);
      const t0 = performance.now();
      const frame = (now: number) => {
        const t = (now - t0) / 1000;
        g.clearRect(0, 0, W, H);
        const fade = t < 0.25 ? t / 0.25 : t > 2.4 ? Math.max(0, (2.9 - t) / 0.5) : 1;
        g.fillStyle = `rgba(2,2,4,${0.92 * fade})`;
        for (const b of bats) {
          b.x += b.vx; b.y += b.vy + Math.sin(t * 4 + b.ph) * 1.4 * dpr;
          const flap = Math.sin(t * 18 + b.ph);
          const w = 26 * b.s, h = (10 + flap * 9) * b.s;
          g.beginPath();
          g.moveTo(b.x, b.y);
          g.quadraticCurveTo(b.x - w * 0.5, b.y - h * 1.5, b.x - w, b.y - h * 0.2);
          g.quadraticCurveTo(b.x - w * 0.6, b.y + h * 0.2, b.x - w * 0.35, b.y + 2 * b.s);
          g.quadraticCurveTo(b.x - w * 0.15, b.y + h * 0.1, b.x, b.y + 5 * b.s);
          g.quadraticCurveTo(b.x + w * 0.15, b.y + h * 0.1, b.x + w * 0.35, b.y + 2 * b.s);
          g.quadraticCurveTo(b.x + w * 0.6, b.y + h * 0.2, b.x + w, b.y - h * 0.2);
          g.quadraticCurveTo(b.x + w * 0.5, b.y - h * 1.5, b.x, b.y);
          g.fill();
        }
        if (t < 2.9) requestAnimationFrame(frame);
        else { g.clearRect(0, 0, W, H); running = false; }
      };
      requestAnimationFrame(frame);
    };
    window.addEventListener("ghost-swarm", run);
    return () => window.removeEventListener("ghost-swarm", run);
  }, []);

  return (
    <>
      <div className="cave-stone" aria-hidden="true" />
      <div className="cave-fog cave-fog-a" aria-hidden="true" />
      <div className="cave-fog cave-fog-b" aria-hidden="true" />
      <div className="cave-dim" aria-hidden="true" />
      <canvas ref={swarm} className="pointer-events-none fixed inset-0 z-[90] h-full w-full" aria-hidden="true" />
      <div ref={gauge} className="cave-gauge" aria-hidden="true">
        <span className="cave-gauge-label">{depthM} m</span>
        <span className="cave-gauge-track"><i /></span>
      </div>
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[95] flex justify-center px-4" role="status" aria-live="polite">
        {toast && (
          <p className="cave-toast rise">
            <span className="text-accent">Unlocked</span> · {toast}
          </p>
        )}
      </div>
    </>
  );
}

