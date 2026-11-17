"use client";
import { useEffect, useRef } from "react";

/** Drifting dots that connect to each other and to the pointer. Pauses off-screen; static under reduced motion. */
export default function Constellation() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current, ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0, h = 0, raf = 0, visible = true, mx = -999, my = -999;
    type D = { x: number; y: number; vx: number; vy: number };
    let dots: D[] = [];
    const color = () => getComputedStyle(document.documentElement).getPropertyValue("--glow-a").trim().replace(/\s+/g, ",") || "59,142,246";
    let rgb = color();
    const size = () => {
      const r = c.getBoundingClientRect(); w = r.width; h = r.height;
      c.width = w * dpr; c.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.max(18, Math.min(70, Math.round((w * h) / 9000)));
      dots = Array.from({ length: n }, () => ({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35 }));
      draw();
    };
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < dots.length; i++) {
        const a = dots[i];
        for (let j = i + 1; j < dots.length; j++) {
          const b = dots[j], d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < 120) { ctx.strokeStyle = `rgba(${rgb},${(1 - d / 120) * 0.35})`; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
        }
        const dm = Math.hypot(a.x - mx, a.y - my);
        if (dm < 160) { ctx.strokeStyle = `rgba(${rgb},${(1 - dm / 160) * 0.7})`; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(mx, my); ctx.stroke(); }
        ctx.fillStyle = `rgba(${rgb},0.75)`; ctx.beginPath(); ctx.arc(a.x, a.y, 1.6, 0, 7); ctx.fill();
      }
    };
    const step = () => {
      if (visible && !document.hidden) {
        for (const d of dots) {
          d.x += d.vx; d.y += d.vy;
          if (d.x < 0 || d.x > w) d.vx *= -1; if (d.y < 0 || d.y > h) d.vy *= -1;
          const dx = mx - d.x, dy = my - d.y, dd = Math.hypot(dx, dy);
          if (dd < 140 && dd > 1) { d.x += (dx / dd) * 0.35; d.y += (dy / dd) * 0.35; }
        }
        rgb = color();
        draw();
      }
      raf = requestAnimationFrame(step);
    };
    const move = (e: PointerEvent) => { const r = c.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; };
    const leave = () => { mx = -999; my = -999; };
    size();
    const ro = new ResizeObserver(size); ro.observe(c);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }); io.observe(c);
    if (!reduce) { raf = requestAnimationFrame(step); window.addEventListener("pointermove", move, { passive: true }); document.addEventListener("pointerleave", leave); }
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); window.removeEventListener("pointermove", move); document.removeEventListener("pointerleave", leave); };
  }, []);
  return <canvas ref={ref} className="pointer-events-none absolute inset-0 h-full w-full [mask-image:linear-gradient(to_bottom,#000_60%,transparent)]" aria-hidden="true" />;
}
