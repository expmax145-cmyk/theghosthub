"use client";
import Link from "next/link";
import { useRef } from "react";
import { useRouter } from "next/navigation";
import { haptic, screech, unlock } from "@/lib/cave";

/** The logo is a normal home link. Tapping it five times in three seconds opens a hidden room. */
export default function Logo() {
  const router = useRouter();
  const taps = useRef<number[]>([]);
  return (
    <Link
      href="/"
      className="shrink-0 font-display text-lg tracking-tight"
      onClick={(e) => {
        const now = Date.now();
        taps.current = [...taps.current.filter((t) => now - t < 3000), now];
        if (taps.current.length >= 5) {
          taps.current = [];
          e.preventDefault();
          unlock("cellar"); screech(); haptic([60, 40, 120]);
          router.push("/cellar");
        }
      }}
    >
      <span className="eyes" data-logo-eyes aria-hidden="true"><i /><i /></span>Ghost<span className="text-accent"> Hub</span>
    </Link>
  );
}
