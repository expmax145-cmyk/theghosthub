"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ShowcaseData, ShowcaseProject } from "@/lib/showcase";
import { KIND_ACTION, KIND_LABEL, categoryColor, kindOf, tileHref } from "@/lib/kind";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
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
  const tint = categoryColor(p.category);
  const isNew = Date.now() - +new Date(p.created_on) < 14 * 86400000;
  const reduce = useRef(false);
  useEffect(() => { reduce.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches; }, []);
  const on = () => { if (!reduce.current) setActive(true); };
  const off = () => setActive(false);
  const spot = (e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
  };

  return (
    <article
      className={cx(
        "rise tile group relative aspect-square overflow-hidden rounded-2xl border border-line bg-surface",
        big && "sm:col-span-2 sm:row-span-2",
      )}
      style={{ animationDelay: `${Math.min(index, 12) * 40}ms`, ["--tint" as string]: tint }}
      onPointerEnter={(e) => { if (e.pointerType === "mouse") on(); }}
      onPointerMove={spot}
      onPointerLeave={off}
      onFocus={on}
      onBlur={off}
    >
      <div className="tile-art absolute inset-0">
        {p.thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.thumb} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center" style={{ background: `radial-gradient(120% 120% at 20% 8%, color-mix(in srgb, ${tint} 55%, #0b0c10), #0b0c10 75%)` }}>
            <span className="font-display text-5xl text-white/85 sm:text-6xl">{initials(p.name)}</span>
          </div>
        )}
        {active && <Preview p={p} />}
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/55 to-transparent p-3.5 pt-14 sm:p-4 sm:pt-16">
        <h3 className={cx("font-display leading-tight text-white", big ? "text-2xl sm:text-4xl" : "text-[15px] sm:text-lg")}>{p.name}</h3>
        <p className="mt-1 flex items-center gap-1.5 truncate text-[11px] text-white/70">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: tint }} aria-hidden="true" />{p.category}
        </p>
      </div>
      <span className="pointer-events-none absolute left-2.5 top-2.5 flex items-center gap-1.5">
        <span className="rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-white backdrop-blur-md">{KIND_LABEL[kind]}</span>
        {isNew && <span className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-black" style={{ background: tint }}>New</span>}
      </span>
      <span className="pointer-events-none absolute bottom-3.5 right-3.5 rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-black opacity-100 shadow-lg transition duration-200 sm:translate-y-1 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100 sm:group-focus-within:translate-y-0 sm:group-focus-within:opacity-100">{KIND_ACTION[kind]}</span>
      {href.startsWith("/go/") ? (
        // Plain anchor: this is a server redirect to another site, not an app route, so it must not be prefetched or client-routed.
        <a href={href} className="absolute inset-0 z-10" aria-label={`${KIND_ACTION[kind].replace(/ .$/, "")} ${p.name}`}><span className="sr-only">{p.name}</span></a>
      ) : (
        <Link href={href} prefetch={false} className="absolute inset-0 z-10" aria-label={`${KIND_ACTION[kind].replace(/ .$/, "")} ${p.name}`}><span className="sr-only">{p.name}</span></Link>
      )}
      {hasDetails && (
        <Link href={`/p/${p.slug}`} prefetch={false} className="absolute right-2.5 top-2.5 z-20 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-white backdrop-blur-md hover:bg-black/75 focus:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">Details</Link>
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

  const kindCounts = useMemo(() => {
    const c = { game: 0, app: 0, website: 0, project: 0 };
    projects.forEach((p) => { c[kindOf(p)]++; });
    return c;
  }, [projects]);
  const stats = [
    { n: projects.length, label: projects.length === 1 ? "creation" : "creations" },
    { n: kindCounts.game, label: kindCounts.game === 1 ? "game" : "games" },
    { n: kindCounts.app, label: kindCounts.app === 1 ? "Android app" : "Android apps" },
    { n: kindCounts.website, label: kindCounts.website === 1 ? "website" : "websites" },
  ].filter((x) => x.n > 0);
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.key === "/" && !e.metaKey && !e.ctrlKey && t && !/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) && !t.isContentEditable) { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);
  const headline = profile?.headline?.trim();

  return (
    <div className="min-h-dvh">
      <SiteHeader wide />
      <main id="main">
        <section className="relative isolate overflow-hidden border-b border-line/60" aria-label="Introduction">
          <div className="aurora" aria-hidden="true" />
          <div className="mx-auto max-w-[1500px] px-4 pb-6 pt-7 sm:px-6 sm:pb-8 sm:pt-10">
            <p className="rise inline-flex items-center gap-2 rounded-full border border-line bg-surface/60 px-3 py-1 text-xs font-medium text-muted backdrop-blur">
              <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#34d399] opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-[#34d399]" /></span>
              Live &middot; hover a tile to preview
            </p>
            <h1 className="rise mt-3 max-w-4xl font-display text-[2rem] font-bold leading-[1.04] tracking-tight sm:text-5xl lg:text-[3.4rem]" style={{ animationDelay: "60ms" }}>
              {headline ? headline : <>Games, apps &amp; <span className="grad-text">experiments</span>, all in one place.</>}
            </h1>
            <div className="rise mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" style={{ animationDelay: "120ms" }}>
              <p className="max-w-xl text-[15px] leading-relaxed text-muted sm:text-base">Play in the browser, install on Android, or visit the live sites. Made by {name}.</p>
              {stats.length > 0 && (
                <dl className="flex flex-wrap gap-x-6 gap-y-2">
                  {stats.map((x) => (
                    <div key={x.label} className="flex items-baseline gap-1.5"><dd className="font-display text-2xl font-bold tabular-nums">{x.n}</dd><dt className="text-sm text-muted">{x.label}</dt></div>
                  ))}
                </dl>
              )}
            </div>
          </div>
        </section>

        {!data.configured ? (
          <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6"><div className="card p-6 sm:p-8">
            <h2 className="font-display text-2xl">Setup needed</h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">The database connection is not configured yet. Add the Supabase URL and publishable key to the environment (see <code className="text-text">.env.example</code>), then reload.</p>
          </div></section>
        ) : data.error ? (
          <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6"><p className="card p-6 text-sm text-muted" role="alert">{data.error}</p></section>
        ) : (
          <>
            <div id="work" className="sticky top-14 z-10 scroll-mt-14 border-b border-line/70 bg-ink/80 backdrop-blur-xl">
              <div className="mx-auto max-w-[1500px] space-y-3 px-4 py-3 sm:px-6">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="relative sm:flex-1">
                    <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-faint" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
                    <input ref={searchRef} className="field !rounded-full pl-11 pr-14" type="search" placeholder="Search games, apps and websites…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" />
                    {!q && <kbd className="kbd pointer-events-none absolute right-3.5 top-1/2 hidden -translate-y-1/2 sm:block" aria-hidden="true">/</kbd>}
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:contents">
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
                </div>
                <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="group" aria-label="Categories">
                  <button className="chip" aria-pressed={cat === "All"} onClick={() => setCat("All")}>All <span className="text-faint">{projects.length}</span></button>
                  {categories.map(([c, n]) => <button key={c} className="chip" style={{ ["--tint" as string]: categoryColor(c) }} aria-pressed={cat === c} onClick={() => setCat(c)}>{c} <span className="text-faint">{n}</span></button>)}
                  {filtersActive && <button className="chip !text-accent" onClick={reset}>Reset filters</button>}
                </div>
              </div>
            </div>

            <section className="mx-auto max-w-[1500px] px-4 pb-20 pt-6 sm:px-6" aria-label="Creations">
              {projects.length === 0 ? (
                <div className="card p-12 text-center"><p className="font-display text-2xl">Nothing is published yet.</p><p className="mt-2 text-sm text-muted">New games, apps and websites will appear here as soon as they are published.</p></div>
              ) : filtered.length === 0 ? (
                <div className="card p-12 text-center"><p className="font-display text-2xl">No matches.</p><p className="mt-1 text-sm text-muted">Nothing matches that. Try fewer words or reset the filters.</p><button className="btn btn-ghost btn-sm mt-4" onClick={reset}>Reset filters</button></div>
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
      <SiteFooter owner={name} wide />
    </div>
  );
}
