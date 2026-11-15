"use client";
import { unlock } from "@/lib/cave";

/** A sleeping bat in the footer. Disturb it and the whole colony wakes. */
export default function FooterBat() {
  return (
    <button
      type="button"
      aria-label="Wake the sleeping bat"
      title="Shh…"
      className="footer-bat"
      onClick={() => { unlock("swarm"); window.dispatchEvent(new Event("ghost-swarm")); }}
    >
      <svg viewBox="0 0 40 46" aria-hidden="true">
        <path d="M20 4v8" stroke="currentColor" strokeWidth="1.5" />
        <path d="M20 12c-3 0-5 2-6 5-4 1-8 5-8 13 4-3 7-3 9-1 1 4 3 8 5 12 2-4 4-8 5-12 2-2 5-2 9 1 0-8-4-12-8-13-1-3-3-5-6-5z" fill="currentColor" />
        <circle cx="17" cy="19" r="1" fill="#e0212c" /><circle cx="23" cy="19" r="1" fill="#e0212c" />
      </svg>
    </button>
  );
}
