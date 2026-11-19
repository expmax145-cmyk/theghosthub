"use client";
import { useEffect, useRef } from "react";

/** Desktop-only: a short trail of sparkles behind the pointer, and a burst on click. */
export default function CursorFx() {
  const cvs = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!matchMedia("(hover: hover) and (pointer: fine)").matches || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const c = cvs.current, ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const size = () => { c.width = innerWidth * dpr; c.height = innerHeight * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    size(); addEventListener("resize", size);
    let tx = -100, ty = -100, lastX = -100, lastY = -100, raf = 0;
    type S = { x: number; y: number; vx: number; vy: number; life: number; s: number; hue: number };
    const sp: S[] = [];
    const color = () => getComputedStyle(document.documentElement).getPropertyValue("--glow-a").trim().replace(/\s+/g, ",") || "77,163,255";
    let rgb = color(), tick = 0;
    let enabled = true;
    try { enabled = localStorage.getItem("ghosthub-sparkle") !== "off"; } catch { /* storage blocked */ }
    const pref = (e: Event) => { enabled = (e as CustomEvent<boolean>).detail; };
    addEventListener("ghosthub:sparkle", pref);
    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || !enabled) return;
      tx = e.clientX; ty = e.clientY;
      if (Math.hypot(tx - lastX, ty - lastY) > 16) {
        lastX = tx; lastY = ty;
        for (let i = 0; i < 2; i++) sp.push({ x: tx, y: ty, vx: (Math.random() - 0.5) * 1.2, vy: Math.random() * 0.8 + 0.2, life: 1, s: 2 + Math.random() * 3, hue: Math.random() });
      }
    };
    const down = () => { if (!enabled) return; for (let i = 0; i < 10; i++) { const a = Math.random() * 6.28, v = 1 + Math.random() * 2.5; sp.push({ x: tx, y: ty, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, s: 2 + Math.random() * 3, hue: Math.random() }); } };
    const frame = () => {
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
    addEventListener("pointermove", move, { passive: true }); addEventListener("pointerdown", down, { passive: true });
    return () => { cancelAnimationFrame(raf); removeEventListener("pointermove", move); removeEventListener("pointerdown", down); removeEventListener("resize", size); removeEventListener("ghosthub:sparkle", pref); };
  }, []);
  return <canvas ref={cvs} className="pointer-events-none fixed inset-0 z-[290] h-full w-full" aria-hidden="true" />;
}
