import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import WispCatch from "@/components/arcade/WispCatch";

export const metadata: Metadata = { title: "Arcade", description: "Play Wisp Catch, a quick browser game built into Ghost Hub.", alternates: { canonical: "/arcade" } };

export default function Arcade() {
  return (
    <div className="min-h-dvh">
      <SiteHeader />
      <main id="main" className="mx-auto max-w-3xl px-4 pb-20 pt-10 sm:px-6 sm:pt-14">
        <p className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-accent"><span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />Arcade</p>
        <h1 className="mt-4 font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">Wisp <span className="grad-text">Catch</span></h1>
        <p className="mt-3 max-w-xl text-muted">A tiny game built into Ghost Hub. How long can you keep Wisp safe?</p>
        <div className="mt-6"><WispCatch /></div>
        <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-3">
          <div className="card p-4"><dt className="font-semibold">Move</dt><dd className="mt-1 text-muted">Mouse or finger, or the arrow keys / A and D.</dd></div>
          <div className="card p-4"><dt className="font-semibold">Score</dt><dd className="mt-1 text-muted">Orbs are 1 point, golds are 5 and give a shield. Every 5 in a row raises your multiplier.</dd></div>
          <div className="card p-4"><dt className="font-semibold">Survive</dt><dd className="mt-1 text-muted">Three lives. Red bugs cost one, hearts give one back. P pauses.</dd></div>
        </dl>
        <p className="mt-6 text-sm text-muted">Your best score is saved only in this browser. <Link href="/explore" className="font-medium text-accent hover:underline">Explore the orbit map →</Link></p>
      </main>
      <SiteFooter />
    </div>
  );
}
