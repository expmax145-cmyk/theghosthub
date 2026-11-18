"use client";
import { useEffect, useRef, useState } from "react";
import { GHOST_PATH } from "./Logo";
import { sfx } from "@/lib/sound";

const COLORS = ["#4f8bff", "#38e0c0", "#7cf59b", "#ffd166", "#ff7eb6", "#b79cff", "#ffffff", "#ff9f5a"];
const DURATION = 6400;
const SHOUTS = ["PARTY TIME!", "WOOO!", "DANCE!", "YEAH!"];

type Bit = { x: number; y: number; vx: number; vy: number; r: number; vr: number; w: number; h: number; c: string; kind: 0 | 1 | 2 | 3; life: number; sw: number };

/** Wisp party (Konami code, Ctrl+K, or five quick taps on Wisp): cannons, ghost rain, disco beams, a dancing Wisp and a short party song. */
export default function Party() {
  const [on, setOn] = useState(false);
  const [run, setRun] = useState(0);
  const cvs = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const go = () => { setOn(true); setRun((n) => n + 1); };
    window.addEventListener("ghosthub:party", go);
    return () => window.removeEventListener("ghosthub:party", go);
  }, []);

  useEffect(() => {
    if (!run) return;
    sfx.party();
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const end = window.setTimeout(() => setOn(false), DURATION);
    const canvas = cvs.current, ctx = canvas?.getContext("2d");
    if (reduce || !canvas || !ctx) return () => clearTimeout(end);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth, h = window.innerHeight;
    canvas.width = w * dpr; canvas.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const ghost = new Path2D(GHOST_PATH);
    const bits: Bit[] = [];
    const rnd = (a: number, b: number) => a + Math.random() * (b - a);
    const add = (x: number, y: number, vx: number, vy: number) => bits.push({
      x, y, vx, vy, r: rnd(0, 6), vr: rnd(-0.25, 0.25), w: rnd(6, 11), h: rnd(10, 17), c: COLORS[(Math.random() * COLORS.length) | 0],
      kind: (Math.random() < 0.12 ? 3 : Math.random() < 0.3 ? 2 : Math.random() < 0.5 ? 1 : 0) as 0 | 1 | 2 | 3, life: 1, sw: rnd(0, 6.28),
    });
    const cannon = (fromLeft: boolean, n: number) => {
      const x = fromLeft ? -10 : w + 10, y = h + 10;
      for (let i = 0; i < n; i++) {
        const ang = (fromLeft ? -1 : -Math.PI + 0) * 0 + (fromLeft ? -Math.PI / 2 + rnd(0.15, 1.0) : -Math.PI / 2 - rnd(0.15, 1.0));
        const sp = rnd(13, 27) * Math.min(1.25, h / 700 + 0.35);
        add(x, y, Math.cos(ang) * sp, Math.sin(ang) * sp);
      }
    };
    const rain = (n: number) => { for (let i = 0; i < n; i++) add(rnd(0, w), rnd(-60, -10), rnd(-1.2, 1.2), rnd(2, 5)); };
    const start = performance.now();
    const shots = [[0, () => { cannon(true, 90); cannon(false, 90); }], [1000, () => rain(70)], [1700, () => { cannon(true, 60); cannon(false, 60); }], [2900, () => rain(80)], [3600, () => { cannon(true, 70); cannon(false, 70); }], [4600, () => rain(60)]] as [number, () => void][];
    let si = 0, raf = 0;
    const frame = (now: number) => {
      const t = now - start;
      while (si < shots.length && t >= shots[si][0]) { shots[si][1](); si++; }
      ctx.clearRect(0, 0, w, h);
      for (let i = bits.length - 1; i >= 0; i--) {
        const b = bits[i];
        b.vy += 0.34; b.vx *= 0.992; b.vy *= 0.992; b.x += b.vx + Math.sin(b.sw + t / 220) * 0.7; b.y += b.vy; b.r += b.vr;
        if (b.y > h + 40 || b.x < -60 || b.x > w + 60) { bits.splice(i, 1); continue; }
        ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.r); ctx.globalAlpha = t > DURATION - 800 ? Math.max(0, (DURATION - t) / 800) : 1; ctx.fillStyle = b.c;
        if (b.kind === 0) ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
        else if (b.kind === 1) { ctx.beginPath(); ctx.arc(0, 0, b.w / 2, 0, 7); ctx.fill(); }
        else if (b.kind === 2) { ctx.beginPath(); for (let k = 0; k < 10; k++) { const rr = k % 2 ? b.w * 0.45 : b.w * 1.05, a = (k / 10) * Math.PI * 2; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); }
        else { const sc = b.h * 1.5 / 24; ctx.scale(sc, sc); ctx.translate(-12, -12); ctx.fill(ghost); ctx.fillStyle = "#06101c"; ctx.beginPath(); ctx.arc(9.3, 10.4, 1.4, 0, 7); ctx.arc(14.7, 10.4, 1.4, 0, 7); ctx.fill(); }
        ctx.restore();
      }
      if (t < DURATION) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); clearTimeout(end); };
  }, [run]);

  if (!on) return null;
  const shout = SHOUTS[run % SHOUTS.length];
  return (
    <div className="party-root pointer-events-none fixed inset-0 z-[320] overflow-hidden" aria-hidden="true" key={run}>
      <div className="party-flash absolute inset-0" />
      <div className="party-beam party-beam-a" /><div className="party-beam party-beam-b" />
      <canvas ref={cvs} className="absolute inset-0 h-full w-full" />
      <div className="absolute inset-x-0 top-[16%] flex justify-center px-4">
        <div className="party-banner flex font-display text-4xl font-extrabold tracking-tight sm:text-7xl">
          {shout.split("").map((ch, i) => <span key={i} style={{ ["--i" as string]: i, color: COLORS[i % COLORS.length] }}>{ch === " " ? " " : ch}</span>)}
        </div>
      </div>
      <div className="party-dancer absolute bottom-3 left-1/2">
        <svg viewBox="-2 -9 28 36" className="h-32 w-28 overflow-visible drop-shadow-[0_10px_26px_rgb(var(--glow-a)/0.6)] sm:h-44 sm:w-40">
          <defs><linearGradient id="pw-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#7cb8ff" /><stop offset="0.55" stopColor="#2dd4cf" /><stop offset="1" stopColor="#4ade80" /></linearGradient></defs>
          <path fill="url(#pw-g)" d={GHOST_PATH} />
          <ellipse cx="7.2" cy="13.4" rx="1.5" ry="0.9" fill="#ff9db4" opacity="0.7" /><ellipse cx="16.8" cy="13.4" rx="1.5" ry="0.9" fill="#ff9db4" opacity="0.7" />
          <path d="M8.8 10.6q.9-1.4 1.8 0M13.4 10.6q.9-1.4 1.8 0" stroke="#06101c" strokeWidth="0.7" fill="none" strokeLinecap="round" />
          <path d="M10 12.6q2 2.4 4 0z" fill="#06101c" />
          <path d="M7.6 3.6 12 -5.2l4.4 8.8z" fill="#ff7eb6" /><path d="M9.2 0.4h5.6M10.4 -2h3.2" stroke="#fff" strokeWidth="0.8" strokeLinecap="round" opacity="0.85" /><circle cx="12" cy="-5.4" r="1.2" fill="#ffd166" />
        </svg>
      </div>
    </div>
  );
}
