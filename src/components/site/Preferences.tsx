"use client";
import { useEffect, useRef, useState } from "react";
import { musicOn, setMusic, sfx } from "@/lib/sound";

const VIBES = [
  { id: "", name: "Ocean", a: "#4da3ff", b: "#2dd4cf" },
  { id: "sunset", name: "Sunset", a: "#ff9b5e", b: "#ff6fa8" },
  { id: "forest", name: "Forest", a: "#4ade80", b: "#2dd4bf" },
  { id: "candy", name: "Candy", a: "#f472b6", b: "#a78bfa" },
];

/** Header "Preferences" menu: colour vibe (recolours the whole site), background music and sparkle cursor. */
export default function Preferences() {
  const [open, setOpen] = useState(false);
  const [vibe, setVibe] = useState("");
  const [music, setMusicState] = useState(false);
  const [sparkle, setSparkle] = useState(true);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVibe(document.documentElement.dataset.vibe ?? "");
    setMusicState(musicOn());
    try { setSparkle(localStorage.getItem("ghosthub-sparkle") !== "off"); } catch { /* storage blocked */ }
    const f = (e: Event) => setMusicState((e as CustomEvent<boolean>).detail);
    window.addEventListener("ghosthub:music", f);
    return () => window.removeEventListener("ghosthub:music", f);
  }, []);
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", away); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", away); document.removeEventListener("keydown", esc); };
  }, [open]);

  const choose = (id: string) => {
    if (id) document.documentElement.dataset.vibe = id; else delete document.documentElement.dataset.vibe;
    try { localStorage.setItem("ghosthub-vibe", id); } catch { /* storage blocked */ }
    setVibe(id); sfx.theme();
  };
  const toggleSparkle = () => {
    const next = !sparkle; setSparkle(next);
    try { localStorage.setItem("ghosthub-sparkle", next ? "on" : "off"); } catch { /* storage blocked */ }
    window.dispatchEvent(new CustomEvent("ghosthub:sparkle", { detail: next })); sfx.pop();
  };

  return (
    <div ref={box} className="relative">
      <button type="button" onClick={() => { sfx.pop(); setOpen((o) => !o); }} aria-expanded={open} aria-haspopup="dialog" aria-label="Preferences" title="Preferences"
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line text-muted transition hover:border-accent/50 hover:text-text active:scale-95">
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <path d="M4 7h9M17 7h3M4 17h3M11 17h9" /><circle cx="15" cy="7" r="2" /><circle cx="9" cy="17" r="2" />
        </svg>
      </button>
      {open && (
        <div role="dialog" aria-label="Preferences" className="absolute right-0 top-11 z-50 w-64 max-w-[calc(100vw-2rem)] space-y-4 rounded-2xl border border-line bg-surface p-4 text-left shadow-2xl">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-faint">Colour vibe</p>
            <div className="grid grid-cols-2 gap-2" role="group" aria-label="Colour vibe">
              {VIBES.map((v) => (
                <button key={v.name} type="button" onClick={() => choose(v.id)} aria-pressed={vibe === v.id}
                  className={`flex items-center gap-2 rounded-xl border px-2 py-1.5 text-xs font-medium transition hover:border-accent/60 ${vibe === v.id ? "border-accent bg-raised text-text" : "border-line text-muted"}`}>
                  <span className="h-4 w-4 shrink-0 rounded-full" style={{ background: `linear-gradient(135deg, ${v.a}, ${v.b})` }} />{v.name}
                </button>
              ))}
            </div>
          </div>
          <label className="flex cursor-pointer items-center justify-between gap-3 text-sm text-muted">Background music
            <input type="checkbox" checked={music} onChange={(e) => setMusic(e.target.checked)} className="h-4 w-4 accent-[var(--color-accent)]" /></label>
          <label className="flex cursor-pointer items-center justify-between gap-3 text-sm text-muted">Sparkle cursor
            <input type="checkbox" checked={sparkle} onChange={toggleSparkle} className="h-4 w-4 accent-[var(--color-accent)]" /></label>
        </div>
      )}
    </div>
  );
}
