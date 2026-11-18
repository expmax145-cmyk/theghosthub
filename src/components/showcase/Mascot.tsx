"use client";
import { useEffect, useRef, useState } from "react";
import { GHOST_PATH } from "@/components/site/Logo";
import { sfx } from "@/lib/sound";

const LINES = ["Boo! …just kidding. Hi!", "Hover a tile and I'll show you a preview.", "Press Ctrl+K and I'll take you anywhere.", "I only haunt friendly websites.", "Psst… try the light theme.", "Need something? Just search."];

/** Wisp: the Ghost Hub mascot. Eyes follow the pointer, clicks make it talk, and `say` lets the page speak through it. */
export default function Mascot({ say, className = "" }: { say?: string; className?: string }) {
  const root = useRef<HTMLButtonElement>(null);
  const eyes = useRef<SVGGElement>(null);
  const [line, setLine] = useState<string | null>(null);
  const [n, setN] = useState(0);
  const timer = useRef<number>(0);
  const taps = useRef<number[]>([]);

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const on = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = root.current?.getBoundingClientRect(); if (!r || !eyes.current) return;
        const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height * 0.42);
        const d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / 300);
        eyes.current.style.transform = `translate(${(dx / d) * 1.1 * k}px, ${(dy / d) * 0.9 * k}px)`;
      });
    };
    window.addEventListener("pointermove", on, { passive: true });
    return () => { window.removeEventListener("pointermove", on); cancelAnimationFrame(raf); };
  }, []);

  const speak = (t: string) => { setLine(t); clearTimeout(timer.current); timer.current = window.setTimeout(() => setLine(null), 3600); };
  useEffect(() => { if (say) speak(say); return () => clearTimeout(timer.current); }, [say]);
  const [spin, setSpin] = useState(false);
  useEffect(() => {
    const party = () => { speak("You found my secret party!"); setSpin(true); setTimeout(() => setSpin(false), 950); };
    window.addEventListener("ghosthub:party", party);
    return () => window.removeEventListener("ghosthub:party", party);
  }, []);
  const text = line;

  return (
    <div className={className || "relative"}>
      {text && <p key={text} className="bubble absolute -left-2 top-0 z-10 w-max max-w-[11rem] -translate-x-full rounded-2xl rounded-br-sm border border-line bg-surface/90 px-3 py-2 text-xs leading-snug text-text shadow-lg backdrop-blur sm:max-w-[14rem] sm:text-sm" role="status">{text}</p>}
      <button ref={root} type="button" aria-label="Wisp the ghost. Click to chat." onClick={() => { sfx.giggle(); const now = Date.now(); taps.current = [...taps.current.filter((x) => now - x < 3000), now]; if (taps.current.length >= 5) { taps.current = []; window.dispatchEvent(new Event("ghosthub:party")); return; } speak(LINES[n % LINES.length]); setN(n + 1); }} className={`wisp-float block w-full ${spin ? "wisp-spin" : ""} cursor-pointer outline-offset-4 transition-transform active:scale-90`}>
        <svg viewBox="0 0 24 26" className="h-full w-full overflow-visible drop-shadow-[0_12px_28px_rgb(var(--glow-a)/0.55)]" aria-hidden="true">
          <defs>
            <linearGradient id="wisp-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#7cb8ff" /><stop offset="0.55" stopColor="#2dd4cf" /><stop offset="1" stopColor="#4ade80" /></linearGradient>
          </defs>
          <path fill="url(#wisp-g)" d={GHOST_PATH} />
          <ellipse cx="7.2" cy="13.4" rx="1.5" ry="0.9" fill="#bff5e8" opacity="0.55" /><ellipse cx="16.8" cy="13.4" rx="1.5" ry="0.9" fill="#bff5e8" opacity="0.55" />
          <g ref={eyes} style={{ transition: "transform 0.12s ease-out" }}>
            <ellipse className="wisp-blink" cx="9.3" cy="10.4" rx="1.35" ry="1.6" fill="#06101c" /><ellipse className="wisp-blink" cx="14.7" cy="10.4" rx="1.35" ry="1.6" fill="#06101c" />
          </g>
          <path d="M10.6 13.2q1.4 1.3 2.8 0" fill="none" stroke="#06101c" strokeWidth="0.55" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
