"use client";
import { useEffect, useRef } from "react";

/** Desktop-only: a ring that follows the pointer (grows over clickable things) and a short trail of sparkles. */
export default function CursorFx() {
  const ring = useRef<HTMLDivElement>(null);
  const cvs = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!matchMedia("(hover: hover) and (pointer: fine)").matches || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = ring.current, c = cvs.current, ctx = c?.getContext("2d");
    if (!r || !c || !ctx) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const size = () => { c.width = innerWidth * dpr; c.height = innerHeight * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    size(); addEventListener("resize", size);
    let tx = -100, ty = -100, x = -100, y = -100, lastX = -100, lastY = -100, raf = 0, scale = 1, want = 1, seen = false;
    type S = { x: number; y: number; vx: number; vy: number; life: number; s: number; hue: number };
    const sp: S[] = [];
    const color = () => getComputedStyle(document.documentElement).getPropertyValue("--glow-a").trim().replace(/\s+/g, ",") || "77,163,255";
    let rgb = color(), tick = 0;
    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      tx = e.clientX; ty = e.clientY; seen = true; r.style.opacity = "1";
      const el = e.target as HTMLElement | null;
      want = el?.closest?.("a, button, [role=button], [role=option], .tile, input, select, textarea, label, summary") ? 1.9 : 1;
      if (Math.hypot(tx - lastX, ty - lastY) > 16) {
        lastX = tx; lastY = ty;
        for (let i = 0; i < 2; i++) sp.push({ x: tx, y: ty, vx: (Math.random() - 0.5) * 1.2, vy: Math.random() * 0.8 + 0.2, life: 1, s: 2 + Math.random() * 3, hue: Math.random() });
      }
    };
    const down = () => { want = 0.7; for (let i = 0; i < 10; i++) { const a = Math.random() * 6.28, v = 1 + Math.random() * 2.5; sp.push({ x: tx, y: ty, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, s: 2 + Math.random() * 3, hue: Math.random() }); } };
    const leave = () => { r.style.opacity = "0"; };
    const frame = () => {
      x += (tx - x) * 0.2; y += (ty - y) * 0.2; scale += (want - scale) * 0.2;
      r.style.transform = `translate3d(${x - 18}px, ${y - 18}px, 0) scale(${scale})`;
      if (++tick % 90 === 0) rgb = color();
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      for (let i = sp.length - 1; i >= 0; i--) {
        const p = sp[i]; p.life -= 0.035; if (p.life <= 0) { sp.splice(i, 1); continue; }
        p.x += p.vx; p.y += p.vy; p.vy += 0.03;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.life * 3); ctx.globalAlpha = p.life;
        ctx.fillStyle = p.hue > 0.5 ? `rgb(${rgb})` : "#ffd166";
        const s = p.s * (0.5 + p.life); ctx.beginPath(); ctx.moveTo(0, -s * 1.6); ctx.lineTo(s * 0.4, -s * 0.4); ctx.lineTo(s * 1.6, 0); ctx.lineTo(s * 0.4, s * 0.4); ctx.lineTo(0, s * 1.6); ctx.lineTo(-s * 0.4, s * 0.4); ctx.lineTo(-s * 1.6, 0); ctx.lineTo(-s * 0.4, -s * 0.4); ctx.closePath(); ctx.fill(); ctx.restore();
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    addEventListener("pointermove", move, { passive: true }); addEventListener("pointerdown", down, { passive: true }); document.addEventListener("pointerleave", leave);
    void seen;
    return () => { cancelAnimationFrame(raf); removeEventListener("pointermove", move); removeEventListener("pointerdown", down); document.removeEventListener("pointerleave", leave); removeEventListener("resize", size); };
  }, []);
  return (
    <>
      <canvas ref={cvs} className="pointer-events-none fixed inset-0 z-[290] h-full w-full" aria-hidden="true" />
      <div ref={ring} className="pointer-events-none fixed left-0 top-0 z-[290] h-9 w-9 rounded-full border-2 border-accent/70 opacity-0 transition-opacity duration-300" aria-hidden="true" />
    </>
  );
}
