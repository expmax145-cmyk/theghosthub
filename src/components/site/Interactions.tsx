"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** Global behaviours with no markup: scroll reveals, button ripples + magnetic pull, smart header. */
export default function Interactions() {
  const path = usePathname();

  // Scroll reveals: re-scan after every route change.
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]:not(.in)"));
    if (!els.length) return;
    if (!("IntersectionObserver" in window)) { els.forEach((e) => e.classList.add("in")); return; }
    const io = new IntersectionObserver((entries) => {
      for (const en of entries) if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [path]);

  useEffect(() => {
    const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

    const down = (e: PointerEvent) => {
      if (reduce) return;
      const el = (e.target as HTMLElement | null)?.closest<HTMLElement>(".btn, .chip");
      if (!el || (el as HTMLButtonElement).disabled) return;
      const r = el.getBoundingClientRect();
      const size = Math.max(r.width, r.height) * 2;
      const s = document.createElement("span");
      s.className = "ripple";
      s.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
      el.appendChild(s);
      setTimeout(() => s.remove(), 650);
    };

    let mag: HTMLElement | null = null;
    const move = (e: PointerEvent) => {
      if (!fine || reduce || e.pointerType !== "mouse") return;
      const el = (e.target as HTMLElement | null)?.closest<HTMLElement>(".btn-primary, .btn-ghost");
      if (mag && mag !== el) { mag.style.removeProperty("--tx"); mag.style.removeProperty("--ty"); }
      mag = el ?? null;
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--tx", `${((e.clientX - r.left) / r.width - 0.5) * 8}px`);
      el.style.setProperty("--ty", `${((e.clientY - r.top) / r.height - 0.5) * 6}px`);
    };

    // Smart header: slides away while reading down, returns on any upward scroll.
    const html = document.documentElement;
    let last = window.scrollY, ticking = false;
    const scroll = () => {
      if (ticking) return; ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY, dy = y - last;
        const focusInHeader = !!document.querySelector(".site-header:focus-within");
        if (y < 140 || dy < -6 || focusInHeader) { if (html.dataset.header) html.removeAttribute("data-header"); }
        else if (dy > 8) html.dataset.header = "hidden";
        if (Math.abs(dy) > 6) last = y;
        ticking = false;
      });
    };
    document.addEventListener("pointerdown", down, { passive: true });
    document.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("scroll", scroll, { passive: true });
    return () => {
      document.removeEventListener("pointerdown", down);
      document.removeEventListener("pointermove", move);
      window.removeEventListener("scroll", scroll);
      html.removeAttribute("data-header");
    };
  }, []);
  return null;
}
