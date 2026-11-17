import Link from "next/link";

/** Outline of the ghost on a 24x24 grid (shared by the logo, the mascot and the intro). */
export const GHOST_PATH = "M12 2.5c-4.4 0-7.5 3.3-7.5 7.7v10.3c0 .6.7.9 1.1.5l1.6-1.5c.3-.3.8-.3 1.1 0l1.6 1.5c.3.3.8.3 1.1 0L12 19.7l1.4 1.3c.3.3.8.3 1.1 0l1.6-1.5c.3-.3.8-.3 1.1 0l1.6 1.5c.4.4 1.1.1 1.1-.5V10.2c0-4.4-3.1-7.7-7.5-7.7z";

/** The Ghost Hub mark: a friendly ghost glyph in the brand gradient plus the wordmark. */
export function GhostMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="gh-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#a99cff" /><stop offset="0.55" stopColor="#5cc8ff" /><stop offset="1" stopColor="#5eead4" />
        </linearGradient>
      </defs>
      <path fill="url(#gh-g)" d={GHOST_PATH} />
      <circle cx="9.3" cy="10.4" r="1.35" fill="#0b0c10" /><circle cx="14.7" cy="10.4" r="1.35" fill="#0b0c10" />
    </svg>
  );
}

export default function Logo({ href = "/", size = "text-lg" }: { href?: string; size?: string }) {
  return (
    <Link href={href} className={`group inline-flex shrink-0 items-center gap-2 font-display font-bold ${size}`} aria-label="Ghost Hub home">
      <GhostMark className="h-7 w-7 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:rotate-[-6deg]" />
      <span>Ghost<span className="grad-text"> Hub</span></span>
    </Link>
  );
}
