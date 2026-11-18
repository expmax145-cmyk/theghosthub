import type { Metadata } from "next";
import { loadShowcase } from "@/lib/showcase";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import Orbit from "@/components/showcase/Orbit";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Explore", description: "An orbit map of every game, app and website on Ghost Hub.", alternates: { canonical: "/explore" } };

export default async function Explore() {
  const data = await loadShowcase();
  return (
    <div className="min-h-dvh">
      <SiteHeader />
      <main id="main" className="mx-auto max-w-5xl px-4 pb-20 pt-10 sm:px-6 sm:pt-14">
        <p className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-accent"><span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />Explore</p>
        <h1 className="mt-4 font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">The <span className="grad-text">orbit map</span></h1>
        <p className="mt-3 max-w-xl text-muted">Every creation is a planet. Each ring is a category. Spin the system, hover to peek, click to open.</p>
        {data.error ? <p className="card mt-8 p-6 text-sm text-muted" role="alert">{data.error}</p> : <div className="mt-8"><Orbit projects={data.projects} /></div>}
      </main>
      <SiteFooter />
    </div>
  );
}
