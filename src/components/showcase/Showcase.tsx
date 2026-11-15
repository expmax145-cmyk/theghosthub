"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ShowcaseData, ShowcaseProject } from "@/lib/showcase";
import { KIND_ACTION, KIND_LABEL, kindOf, tileHref } from "@/lib/kind";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import BatIntro from "./BatIntro";
import { cx } from "@/lib/utils";

type Sort = "recent" | "newest" | "oldest" | "name";

const initials = (name: string) => name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "•";

/** Hover preview: a short muted video if one is uploaded, otherwise a slideshow of the screenshots. */
function Preview({ p }: { p: ShowcaseProject }) {
  const video = p.videos.find((v) => v.url)?.url ?? null;
  const frames = useMemo(() => [...new Set([p.thumb, ...p.screenshots.map((s) => s.url)].filter(Boolean) as string[])], [p]);
  const [i, setI] = useState(0);
  useEffect(() => {
    if (video || frames.length < 2) return;
    const t = window.setInterval(() => setI((n) => (n + 1) % frames.length), 900);
    return () => window.clearInterval(t);
  }, [video, frames]);
  if (video) return <video src={video} autoPlay muted loop playsInline preload="auto" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" />;
  if (frames.length < 2) return null;
  return (
    <>
      {frames.map((f, k) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={f} src={f} alt="" aria-hidden="true" className={cx("absolute inset-0 h-full w-full object-cover transition-opacity duration-300", k === i ? "opacity-100" : "opacity-0")} />
      ))}
    </>
  );
}

function Tile({ p, big, index }: { p: ShowcaseProject; big?: boolean; index: number }) {
  const [active, setActive] = useState(false);
  const kind = kindOf(p);
  const href = tileHref(p);
  const hasDetails = href !== `/p/${p.slug}`;
  const reduce = useRef(false);
  useEffect(() => { reduce.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches; }, []);
  const on = () => { if (!reduce.current) setActive(true); };
  const off = () => setActive(false);

  return (
    <article
      className={cx(
        "rise group relative aspect-square overflow-hidden rounded-[4px] border border-line bg-surface transition duration-200 hover:z-10 hover:scale-[1.03] hover:border-accent hover:shadow-[0_0_32px_rgba(224,33,44,0.35)] focus-within:z-10 focus-within:border-accent",
        big && "sm:col-span-2 sm:row-span-2 border-accent/50",
      )}
      style={{ animationDelay: `${Math.min(index, 12) * 35}ms` }}
      onPointerEnter={(e) => { if (e.pointerType === "mouse") on(); }}
      onPointerLeave={off}
      onFocus={on}
      onBlur={off}
    >
      <div className="absolute inset-0">
        {p.thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.thumb} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(120%_120%_at_20%_10%,#1a0508,#050509)]">
            <span className="font-display text-5xl text-accent/70">{initials(p.name)}</span>
          </div>
        )}
        {active && <Preview p={p} />}
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/70 to-transparent p-3 pt-12">
        <h3 className={cx("font-display leading-tight text-text", big ? "text-xl sm:text-3xl" : "text-sm sm:text-base")}>{p.name}</h3>
        <p className="mt-0.5 truncate text-[11px] text-muted">{p.category}</p>
      </div>
      <span className="pointer-events-none absolute left-2 top-2 rounded-[2px] border border-line bg-ink/80 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.12em] text-muted">{KIND_LABEL[kind]}</span>
      <span className={cx("pointer-events-none absolute bottom-3 right-3 rounded-[3px] bg-accent px-2.5 py-1 text-[11px] font-medium text-white transition-opacity", "opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100")}>{KIND_ACTION[kind]}</span>
      {href.startsWith("/go/") ? (
        // Plain anchor: this is a server redirect to another site, not an app route, so it must not be prefetched or client-routed.
        <a href={href} className="absolute inset-0 z-10" aria-label={`${KIND_ACTION[kind].replace(/ .$/, "")} ${p.name}`}><span className="sr-only">{p.name}</span></a>
      ) : (
        <Link href={href} prefetch={false} className="absolute inset-0 z-10" aria-label={`${KIND_ACTION[kind].replace(/ .$/, "")} ${p.name}`}><span className="sr-only">{p.name}</span></Link>
      )}
      {hasDetails && (
        <Link href={`/p/${p.slug}`} prefetch={false} className="absolute right-2 top-2 z-20 rounded-[2px] border border-line bg-ink/80 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.12em] text-muted hover:text-text focus:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">Details</Link>
      )}
    </article>
  );
}

export default function Showcase({ data }: { data: ShowcaseData }) {
  const { projects, profile } = data;
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [tech, setTech] = useState("");
  const [sort, setSort] = useState<Sort>("recent");

  // /?cat=<name> pre-selects a category (used by breadcrumbs on project pages).
  useEffect(() => {
    const c = new URLSearchParams(window.location.search).get("cat");
    if (c && projects.some((p) => p.category === c)) setCat(c);
  }, [projects]);

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    projects.forEach((p) => counts.set(p.category, (counts.get(p.category) ?? 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [projects]);
  const techs = useMemo(() => [...new Set(projects.flatMap((p) => p.technologies))].sort((a, b) => a.localeCompare(b)), [projects]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = projects.filter((p) => {
      if (cat !== "All" && p.category !== cat) return false;
      if (tech && !p.technologies.includes(tech)) return false;
      return !needle || [p.name, p.short_description, p.category, ...p.technologies, ...p.tags].join(" ").toLowerCase().includes(needle);
    });
    return [...list].sort((a, b) =>
      sort === "name" ? a.name.localeCompare(b.name)
        : sort === "oldest" ? +new Date(a.created_on) - +new Date(b.created_on)
        : sort === "newest" ? +new Date(b.created_on) - +new Date(a.created_on)
        : +new Date(b.updated_at) - +new Date(a.updated_at));
  }, [projects, q, cat, tech, sort]);

  const filtersActive = Boolean(q || tech || cat !== "All" || sort !== "recent");
  const reset = () => { setQ(""); setCat("All"); setTech(""); setSort("recent"); };
  // Featured projects get the big tiles, but only in the default view and only the first two.
  const bigIds = useMemo(() => new Set(filtersActive ? [] : filtered.filter((p) => p.is_featured).slice(0, 2).map((p) => p.id)), [filtered, filtersActive]);
  const name = profile?.display_name ?? "Ghost Hub";

  return (
    <div className="min-h-dvh">
      <BatIntro />
      <SiteHeader />
      <main id="main">
        <h1 className="sr-only">Ghost Hub: games, apps and websites</h1>

        {!data.configured ? (
          <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6"><div className="card p-6 sm:p-8">
            <h2 className="font-display text-2xl">Setup needed</h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">The database connection is not configured yet. Add the Supabase URL and publishable key to the environment (see <code className="text-text">.env.example</code>), then reload.</p>
          </div></section>
        ) : data.error ? (
          <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6"><p className="card p-6 text-sm text-muted" role="alert">{data.error}</p></section>
        ) : (
          <>
            <div id="work" className="sticky top-14 z-10 scroll-mt-14 border-b border-line bg-ink/90 backdrop-blur">
              <div className="mx-auto max-w-[1500px] space-y-3 px-4 py-3 sm:px-6">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input className="field sm:flex-1" type="search" placeholder="Search games, apps and websites…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" />
                  <select className="field sm:w-44" value={tech} onChange={(e) => setTech(e.target.value)} aria-label="Filter by technology">
                    <option value="">All technologies</option>
                    {techs.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <select className="field sm:w-44" value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort">
                    <option value="recent">Recently updated</option>
                    <option value="newest">Newest first</option>
                    <option value="oldest">Oldest first</option>
                    <option value="name">Name A–Z</option>
                  </select>
                </div>
                <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="group" aria-label="Categories">
                  <button className="chip" aria-pressed={cat === "All"} onClick={() => setCat("All")}>All <span className="ml-1.5 text-faint">{projects.length}</span></button>
                  {categories.map(([c, n]) => <button key={c} className="chip" aria-pressed={cat === c} onClick={() => setCat(c)}>{c} <span className="ml-1.5 text-faint">{n}</span></button>)}
                  {filtersActive && <button className="chip border-accent/50 text-accent" onClick={reset}>Reset filters</button>}
                </div>
              </div>
            </div>

            <section className="mx-auto max-w-[1500px] px-4 pb-20 pt-5 sm:px-6" aria-label="Creations">
              {projects.length === 0 ? (
                <div className="card p-10 text-center"><p className="font-display text-2xl">Nothing is published yet.</p><p className="mt-2 text-sm text-muted">New games, apps and websites will appear here as soon as they are published.</p></div>
              ) : filtered.length === 0 ? (
                <div className="card p-10 text-center"><p className="font-display text-2xl">No matches.</p><button className="btn btn-ghost btn-sm mt-4" onClick={reset}>Reset filters</button></div>
              ) : (
                <>
                  <p className="sr-only" aria-live="polite">{filtered.length} {filtered.length === 1 ? "result" : "results"}</p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5 xl:grid-cols-6 [grid-auto-flow:dense]">
                    {filtered.map((p, i) => <Tile key={p.id} p={p} index={i} big={bigIds.has(p.id)} />)}
                  </div>
                </>
              )}
            </section>
          </>
        )}
      </main>
      <SiteFooter owner={name}>
        <button className="underline-offset-4 hover:text-text hover:underline" onClick={() => window.dispatchEvent(new Event("ghost-intro-replay"))}>Replay intro</button>
      </SiteFooter>
    </div>
  );
}
