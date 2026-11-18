"use client";
import { useEffect, useState } from "react";
import { GHOST_PATH } from "./Logo";
import { sfx } from "@/lib/sound";

/** A little ghost that appears after scrolling; its ring fills with reading progress. */
export default function BackToTop() {
  const [p, setP] = useState(0);
  const [show, setShow] = useState(false);
  useEffect(() => {
    let raf = 0;
    const on = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        setP(max > 0 ? Math.min(1, window.scrollY / max) : 0);
        setShow(window.scrollY > 700);
      });
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => { window.removeEventListener("scroll", on); cancelAnimationFrame(raf); };
  }, []);
  const C = 2 * Math.PI * 21;
  return (
    <button type="button" aria-label="Back to top" tabIndex={show ? 0 : -1}
      onClick={() => { sfx.toTop(); window.scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); }}
      className={`group fixed bottom-5 right-4 z-40 grid h-12 w-12 place-items-center rounded-full border border-line bg-surface/80 shadow-lg backdrop-blur-md transition duration-300 hover:border-accent/60 sm:right-6 ${show ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"}`}>
      <svg viewBox="0 0 48 48" className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle cx="24" cy="24" r="21" fill="none" stroke="var(--color-accent)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - p)} />
      </svg>
      <svg viewBox="0 0 24 24" className="h-5 w-5 text-accent transition-transform duration-300 group-hover:-translate-y-1" aria-hidden="true"><path fill="currentColor" d={GHOST_PATH} /><circle cx="9.3" cy="10.4" r="1.4" fill="var(--color-surface)" /><circle cx="14.7" cy="10.4" r="1.4" fill="var(--color-surface)" /></svg>
    </button>
  );
}
