"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { blip } from "@/lib/sound";

/** Global behaviours with no markup: scroll reveals, button ripples + magnetic pull, smart header. */
export default function Interactions() {
  const path = usePathname();

  // Scroll reveals. Pages stream in after a client-side navigation, so watch the DOM for new
  // [data-reveal] elements instead of scanning once (a one-off scan missed them and left blank gaps).
  useEffect(() => {
    if (!("IntersectionObserver" in window)) { document.querySelectorAll("[data-reveal]").forEach((e) => e.classList.add("in")); return; }
    const io = new IntersectionObserver((entries) => {
      for (const en of entries) if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0.05 });
    const seen = new WeakSet<Element>();
    const scan = () => document.querySelectorAll("[data-reveal]:not(.in)").forEach((e) => { if (!seen.has(e)) { seen.add(e); io.observe(e); } });
    scan();
    let raf = 0;
    const mo = new MutationObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(scan); });
    mo.observe(document.body, { childList: true, subtree: true });
    // Safety net: never leave content invisible if the observer misfires.
    const t = window.setTimeout(() => document.querySelectorAll("[data-reveal]:not(.in)").forEach((e) => { const r = e.getBoundingClientRect(); if (r.top < innerHeight && r.bottom > 0) e.classList.add("in"); }), 1500);
    return () => { io.disconnect(); mo.disconnect(); cancelAnimationFrame(raf); clearTimeout(t); };
  }, [path]);

  useEffect(() => {
    const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

    const down = (e: PointerEvent) => {
      if ((e.target as HTMLElement | null)?.closest(".btn, .chip, [role=option]")) blip(540, 0.05);
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
    // Konami code: Wisp throws a party.
    const code = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
    let pos = 0;
    const konami = (e: KeyboardEvent) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      pos = k === code[pos] ? pos + 1 : k === code[0] ? 1 : 0;
      if (pos === code.length) { pos = 0; window.dispatchEvent(new Event("ghosthub:party")); }
    };
    const hover = (e: PointerEvent) => { if (e.pointerType === "mouse" && (e.target as HTMLElement | null)?.closest?.("article.tile")) blip(780, 0.035, 0.025); };
    let lastTile: Element | null = null;
    const over = (e: PointerEvent) => { const t = (e.target as HTMLElement | null)?.closest?.("article.tile") ?? null; if (t && t !== lastTile) hover(e); lastTile = t; };
    window.addEventListener("keydown", konami);
    document.addEventListener("pointerover", over, { passive: true });
    document.addEventListener("pointerdown", down, { passive: true });
    document.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("scroll", scroll, { passive: true });
    return () => {
      document.removeEventListener("pointerdown", down);
      document.removeEventListener("pointermove", move);
      window.removeEventListener("scroll", scroll);
      window.removeEventListener("keydown", konami);
      document.removeEventListener("pointerover", over);
      html.removeAttribute("data-header");
    };
  }, []);
  return null;
}
