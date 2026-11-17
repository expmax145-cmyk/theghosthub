"use client";
import { openPalette } from "@/lib/palette";

export default function PaletteButton() {
  return (
    <button type="button" onClick={openPalette} aria-label="Open command palette (Ctrl K)" className="inline-flex h-9 items-center gap-2 rounded-full border border-line px-2.5 text-muted transition hover:border-accent/50 hover:text-text active:scale-95 sm:px-3">
      <svg viewBox="0 0 24 24" className="h-[17px] w-[17px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
      <kbd className="kbd hidden sm:inline">Ctrl K</kbd>
    </button>
  );
}
