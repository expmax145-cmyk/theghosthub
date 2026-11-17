"use client";
import { useEffect, useState } from "react";
import { setSound, soundOn } from "@/lib/sound";

export default function SoundToggle() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    setOn(soundOn());
    const f = (e: Event) => setOn((e as CustomEvent<boolean>).detail);
    window.addEventListener("ghosthub:sound", f);
    return () => window.removeEventListener("ghosthub:sound", f);
  }, []);
  return (
    <button type="button" onClick={() => setSound(!on)} aria-pressed={on} aria-label={on ? "Turn sound off" : "Turn sound on"}
      className="hidden h-9 w-9 items-center justify-center rounded-full border border-line text-muted transition hover:border-accent/50 hover:text-text active:scale-95 sm:inline-flex">
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M11 5 6 9H3v6h3l5 4V5z" />{on ? <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" /> : <path d="m16 9 5 6m0-6-5 6" />}
      </svg>
    </button>
  );
}
