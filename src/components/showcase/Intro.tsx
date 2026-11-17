"use client";
import { useEffect, useRef, useState } from "react";
import { GHOST_PATH } from "@/components/site/Logo";

const SEEN = "ghosthub-intro-v2";
const DARK = ["#a99cff", "#7aa8ff", "#5cc8ff", "#5eead4", "#c4b5fd"];
const LIGHT = ["#5446e0", "#2563eb", "#0a76cc", "#0d9672", "#7c3aed"];

type P = { x: number; y: number; sx: number; sy: number; tx: number; ty: number; a: number; r: number; c: string; vx: number; vy: number };

/** Sample the ghost + wordmark as a cloud of target points. */
function sampleTargets(w: number, h: number, step: number): [number, number][] {
  const off = document.createElement("canvas");
  off.width = w; off.height = h;
  const g = off.getContext("2d", { willReadFrequently: true });
  if (!g) return [];
  const size = Math.min(w * 0.62, h * 0.4, 300);
  const gx = w / 2 - size / 2, gy = h / 2 - size * 0.78;
  g.fillStyle = "#fff";
  g.save(); g.translate(gx, gy); g.scale(size / 24, size / 24); g.fill(new Path2D(GHOST_PATH)); g.restore();
  // eyes punched out
  g.globalCompositeOperation = "destination-out";
  const er = (1.6 / 24) * size;
  for (const ex of [9.3, 14.7]) { g.beginPath(); g.arc(gx + (ex / 24) * size, gy + (10.4 / 24) * size, er, 0, 7); g.fill(); }
  g.globalCompositeOperation = "source-over";
  const fs = Math.max(26, Math.min(w * 0.11, 64));
  g.font = `700 ${fs}px "Bricolage Grotesque Variable", "Inter Variable", system-ui, sans-serif`;
  g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText("Ghost Hub", w / 2, gy + size + fs * 1.1);
  const d = g.getImageData(0, 0, w, h).data;
  const pts: [number, number][] = [];
  for (let y = 0; y < h; y += step) for (let x = 0; x < w; x += step) if (d[(y * w + x) * 4 + 3] > 140) pts.push([x, y]);
  return pts;
}

export default function Intro() {
  const [run, setRun] = useState(0);        // 0 = not running
  const [gone, setGone] = useState(false);
  const cvs = useRef<HTMLCanvasElement>(null);
  const done = useRef<() => void>(() => {});

  useEffect(() => {
    let seen = false;
    try { seen = sessionStorage.getItem(SEEN) === "1"; } catch { /* storage blocked */ }
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (seen || reduce) { document.documentElement.dataset.introSeen = "1"; setGone(true); }
    else setRun(1);
    const replay = () => { document.documentElement.removeAttribute("data-intro-seen"); setGone(false); setRun((n) => n + 1); window.scrollTo(0, 0); };
    window.addEventListener("ghosthub:intro", replay);
    return () => window.removeEventListener("ghosthub:intro", replay);
  }, []);

  useEffect(() => {
    if (!run) return;
    const canvas = cvs.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) { setGone(true); return; }
    const root = document.documentElement;
    const light = root.dataset.theme === "light";
    const COLORS = light ? LIGHT : DARK;
    root.style.overflow = "hidden";
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(window.innerWidth), h = Math.round(window.innerHeight);
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
    const mobile = w < 640;
    const targets = sampleTargets(w, h, mobile ? 4 : 3);
    const count = Math.min(targets.length, mobile ? 1400 : 2600);
    for (let i = targets.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [targets[i], targets[j]] = [targets[j], targets[i]]; }
    const R = Math.hypot(w, h) * 0.55;
    const ps: P[] = Array.from({ length: count }, (_, i) => {
      const a = Math.random() * Math.PI * 2, r = R * (0.45 + Math.random() * 0.6);
      const [tx, ty] = targets[i];
      return { x: 0, y: 0, sx: w / 2 + Math.cos(a) * r, sy: h / 2 + Math.sin(a) * r, tx, ty, a, r, c: COLORS[(Math.random() * COLORS.length) | 0], vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2 };
    });
    const T_IN = 1900, T_HOLD = 2800, T_END = 3500;
    const start = performance.now();
    let raf = 0, finished = false, mx = -999, my = -999, burstAt = 0;
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);
    const finish = () => {
      if (finished) return; finished = true;
      cancelAnimationFrame(raf);
      try { sessionStorage.setItem(SEEN, "1"); } catch { /* storage blocked */ }
      root.style.overflow = "";
      root.dataset.introSeen = "1";
      setGone(true); setRun(0);
    };
    done.current = finish;
    const move = (e: PointerEvent) => { mx = e.clientX; my = e.clientY; };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape" || e.key === "Enter" || e.key === " ") finish(); };
    window.addEventListener("pointermove", move);
    window.addEventListener("keydown", key);
    const frame = (now: number) => {
      const t = now - start;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = light ? "source-over" : "lighter";
      const fade = t > T_HOLD ? Math.max(0, 1 - (t - T_HOLD) / (T_END - T_HOLD)) : 1;
      canvas.style.opacity = String(fade);
      if (t > T_HOLD && !burstAt) burstAt = now;
      for (const p of ps) {
        if (t < T_IN) {
          const k = ease(Math.min(1, t / T_IN));
          const ang = p.a + (1 - k) * 5;               // spiral inwards
          const rr = p.r * (1 - k);
          p.x = p.tx + Math.cos(ang) * rr * 0.9 ; p.y = p.ty + Math.sin(ang) * rr * 0.9;
        } else if (t < T_HOLD) {
          // hold: shimmer, with a gentle push away from the pointer
          const jx = Math.sin(t / 260 + p.a * 9) * 0.9, jy = Math.cos(t / 300 + p.a * 7) * 0.9;
          let ox = 0, oy = 0;
          const dx = p.tx - mx, dy = p.ty - my, d2 = dx * dx + dy * dy;
          if (d2 < 6400) { const f = (80 - Math.sqrt(d2)) / 80; ox = (dx / (Math.sqrt(d2) || 1)) * f * 26; oy = (dy / (Math.sqrt(d2) || 1)) * f * 26; }
          p.x += (p.tx + jx + ox - p.x) * 0.22; p.y += (p.ty + jy + oy - p.y) * 0.22;
        } else {
          const dx = p.tx - w / 2, dy = p.ty - h / 2, len = Math.hypot(dx, dy) || 1;
          p.x += (dx / len) * 14 + p.vx; p.y += (dy / len) * 14 + p.vy;
        }
        ctx.fillStyle = p.c;
        ctx.globalAlpha = 0.9;
        ctx.fillRect(p.x, p.y, 2.2, 2.2);
      }
      ctx.globalAlpha = 1;
      if (t >= T_END) { finish(); return; }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      finished = true; cancelAnimationFrame(raf); root.style.overflow = "";
      window.removeEventListener("pointermove", move); window.removeEventListener("keydown", key);
    };
  }, [run]);

  if (gone) return null;
  return (
    <div data-intro className={`fixed inset-0 z-[300] bg-ink transition-opacity duration-700 ${run ? "" : "opacity-0"}`} role="dialog" aria-label="Welcome animation" onClick={() => done.current()}>
      <canvas ref={cvs} className="absolute inset-0 h-full w-full" aria-hidden="true" />
      <button type="button" onClick={(e) => { e.stopPropagation(); done.current(); }} className="btn btn-ghost btn-sm absolute bottom-6 right-5">Skip</button>
    </div>
  );
}
