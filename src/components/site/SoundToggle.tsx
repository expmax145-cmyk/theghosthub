"use client";
import { useEffect, useState } from "react";
import { musicOn, setMusic } from "@/lib/sound";

export default function SoundToggle() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    setOn(musicOn());
    const f = (e: Event) => setOn((e as CustomEvent<boolean>).detail);
    window.addEventListener("ghosthub:music", f);
    return () => window.removeEventListener("ghosthub:music", f);
  }, []);
  return (
    <button type="button" onClick={() => setMusic(!on)} aria-pressed={on} title={on ? "Music on (sound effects stay on)" : "Music off"} aria-label={on ? "Turn background music off" : "Turn background music on"}
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line text-muted transition hover:border-accent/50 hover:text-text active:scale-95">
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />{!on && <path d="M3 3l18 18" />}
      </svg>
    </button>
  );
}
