"use client";
import { useEffect, useState } from "react";
import { sfx } from "@/lib/sound";

const VIBES = [
  { id: "", name: "Ocean", a: "#4da3ff", b: "#2dd4cf" },
  { id: "sunset", name: "Sunset", a: "#ff9b5e", b: "#ff6fa8" },
  { id: "forest", name: "Forest", a: "#4ade80", b: "#2dd4bf" },
  { id: "candy", name: "Candy", a: "#f472b6", b: "#a78bfa" },
];

/** Floating colour-mood picker: re-tints the whole site (accent, glows, gradients) and remembers the choice. */
export default function VibePicker() {
  const [open, setOpen] = useState(false);
  const [cur, setCur] = useState("");
  useEffect(() => { setCur(document.documentElement.dataset.vibe ?? ""); }, []);
  const choose = (id: string) => {
    if (id) document.documentElement.dataset.vibe = id; else delete document.documentElement.dataset.vibe;
    try { localStorage.setItem("ghosthub-vibe", id); } catch { /* storage blocked */ }
    setCur(id); sfx.theme();
  };
  return (
    <div className="fixed bottom-5 left-4 z-40 sm:left-6">
      <div className={`mb-2 flex flex-col gap-2 rounded-2xl border border-line bg-surface/90 p-2 shadow-xl backdrop-blur-md transition duration-200 ${open ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0"}`} role="group" aria-label="Colour vibe">
        {VIBES.map((v) => (
          <button key={v.name} type="button" tabIndex={open ? 0 : -1} onClick={() => choose(v.id)} aria-pressed={cur === v.id} title={v.name}
            className={`flex items-center gap-2 rounded-xl px-2 py-1.5 text-xs font-medium text-muted transition hover:bg-raised hover:text-text ${cur === v.id ? "bg-raised text-text" : ""}`}>
            <span className="h-5 w-5 rounded-full ring-2 ring-line" style={{ background: `linear-gradient(135deg, ${v.a}, ${v.b})` }} />{v.name}
          </button>
        ))}
      </div>
      <button type="button" onClick={() => { sfx.pop(); setOpen((o) => !o); }} aria-expanded={open} aria-label="Change colour vibe"
        className="grid h-11 w-11 place-items-center rounded-full border border-line bg-surface/80 text-lg shadow-lg backdrop-blur-md transition hover:border-accent/60 active:scale-95">
        <span className="h-5 w-5 rounded-full" style={{ background: "conic-gradient(#4da3ff, #2dd4cf, #4ade80, #ffd166, #ff6fa8, #a78bfa, #4da3ff)" }} />
      </button>
    </div>
  );
}
