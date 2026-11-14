"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ShowcaseData, ShowcaseProject } from "@/lib/showcase";
import { STATUS_LABEL } from "@/lib/types";
import BatIntro from "./BatIntro";
import { cx, formatBytes, formatDate, safeUrl } from "@/lib/utils";

type Sort = "recent" | "newest" | "name" | "oldest";

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "•";
}

function Thumb({ p, className }: { p: ShowcaseProject; className?: string }) {
  return p.thumb ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={p.thumb} alt="" loading="lazy" decoding="async" className={cx("h-full w-full object-cover", className)} />
  ) : (
    <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(120%_120%_at_20%_10%,#1a0508,#050509)]">
      <span className="font-display text-5xl text-accent/70">{initials(p.name)}</span>
    </div>
  );
}

function Card({ p, index, onOpen, large }: { p: ShowcaseProject; index: number; onOpen: () => void; large?: boolean }) {
  const demo = safeUrl(p.live_demo_url);
  const repo = safeUrl(p.public_repository_url);
  return (
    <article
      className={cx("rise group card flex flex-col overflow-hidden transition-all duration-200 hover:border-accent/70 hover:shadow-[0_0_30px_rgba(224,33,44,0.18)]", large && "card-major")}
      style={{ animationDelay: `${Math.min(index, 8) * 50}ms` }}
    >
      <button onClick={onOpen} className="block text-left" aria-label={`Open ${p.name}`}>
        <div className={cx("overflow-hidden bg-raised", large ? "aspect-[16/9]" : "aspect-[16/10]")}>
          <div className="h-full w-full transition-transform duration-500 group-hover:scale-[1.03]">
            <Thumb p={p} />
          </div>
        </div>
      </button>
      <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3 text-[11.5px] uppercase tracking-[0.14em] text-faint">
          <span className="truncate">{p.category}</span>
          <span className="shrink-0 text-sage">{STATUS_LABEL[p.status]}</span>
        </div>
        <button onClick={onOpen} className="text-left">
          <h3 className="font-display text-xl leading-snug text-text group-hover:text-accent sm:text-2xl">{p.name}</h3>
        </button>
        {p.short_description && <p className="line-clamp-3 text-sm leading-relaxed text-muted">{p.short_description}</p>}
        {p.technologies.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {p.technologies.slice(0, 5).map((t) => <span key={t} className="tag">{t}</span>)}
            {p.technologies.length > 5 && <span className="tag">+{p.technologies.length - 5}</span>}
          </div>
        )}
        {(demo || repo) && (
          <div className="mt-auto flex gap-4 pt-1 text-[13px]">
            {demo && <a href={demo} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Live demo ↗</a>}
            {repo && <a href={repo} target="_blank" rel="noopener noreferrer" className="text-muted hover:text-text hover:underline">Source ↗</a>}
          </div>
        )}
      </div>
    </article>
  );
}

function Detail({ p, onClose }: { p: ShowcaseProject; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [shot, setShot] = useState(0);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);
  const demo = safeUrl(p.live_demo_url);
  const repo = safeUrl(p.public_repository_url);
  const video = safeUrl(p.video_url);
  const links = (p.extra_links ?? []).map((l) => ({ label: l.label, url: safeUrl(l.url) })).filter((l) => l.url);
  const media = p.screenshots.filter((s) => s.url);
  const current = media[shot] ?? null;

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => { if (e.target === ref.current) ref.current?.close(); }}
      className="m-0 ml-auto h-dvh w-full max-w-3xl overflow-y-auto border-l border-accent/60 bg-ink p-0 text-text backdrop:bg-black/70"
      aria-label={p.name}
    >
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-ink/90 px-4 py-3 backdrop-blur sm:px-6">
        <span className="truncate text-xs uppercase tracking-[0.14em] text-faint">{p.category}</span>
        <button onClick={() => ref.current?.close()} className="btn btn-ghost btn-sm" aria-label="Close project">Close ✕</button>
      </div>

      <div className="space-y-8 px-4 pb-16 pt-6 sm:px-6">
        <header className="space-y-3">
          <h2 className="font-display text-3xl leading-tight sm:text-4xl">{p.name}</h2>
          {p.short_description && <p className="text-base leading-relaxed text-muted">{p.short_description}</p>}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-faint">
            <span className="text-sage">{STATUS_LABEL[p.status]}</span>
            <span>Created {formatDate(p.created_on)}</span>
            <span>Updated {formatDate(p.updated_at)}</span>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {demo && <a className="btn btn-primary" href={demo} target="_blank" rel="noopener noreferrer">Open live demo ↗</a>}
            {repo && <a className="btn btn-ghost" href={repo} target="_blank" rel="noopener noreferrer">Source code ↗</a>}
            {video && <a className="btn btn-ghost" href={video} target="_blank" rel="noopener noreferrer">Watch demo ↗</a>}
            {links.map((l) => (
              <a key={l.label + l.url} className="btn btn-ghost" href={l.url!} target="_blank" rel="noopener noreferrer">{l.label} ↗</a>
            ))}
          </div>
        </header>

        {(current || p.thumb) && (
          <section aria-label="Screenshots" className="space-y-3">
            <div className="overflow-hidden rounded-[4px] border border-line bg-surface">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={current?.url ?? p.thumb!} alt={`${p.name} screenshot`} className="max-h-[70vh] w-full object-contain" />
            </div>
            {media.length > 1 && (
              <div className="scrollbar-none flex gap-2 overflow-x-auto pb-1">
                {media.map((s, i) => (
                  <button key={s.id} onClick={() => setShot(i)} aria-label={`Screenshot ${i + 1}`} aria-current={i === shot}
                    className={cx("h-16 w-24 shrink-0 overflow-hidden rounded-[3px] border", i === shot ? "border-accent" : "border-line opacity-70 hover:opacity-100")}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={s.url!} alt="" loading="lazy" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {p.videos.filter((v) => v.url).map((v) => (
          <video key={v.id} src={v.url!} controls preload="metadata" playsInline className="w-full rounded-[4px] border border-line bg-black" />
        ))}

        {p.description && (
          <section className="space-y-3">
            <h3 className="text-xs uppercase tracking-[0.14em] text-faint">Overview</h3>
            <div className="prose-hub text-[15px] text-text/90">
              {p.description.split(/\n{2,}/).map((para, i) => <p key={i} className="whitespace-pre-line">{para}</p>)}
            </div>
          </section>
        )}

        {p.features.length > 0 && (
          <section className="space-y-3">
            <h3 className="text-xs uppercase tracking-[0.14em] text-faint">Features</h3>
            <ul className="grid gap-2 sm:grid-cols-2">
              {p.features.map((f) => (
                <li key={f} className="flex gap-2 text-sm text-muted"><span className="text-accent">▸</span>{f}</li>
              ))}
            </ul>
          </section>
        )}

        {p.technologies.length > 0 && (
          <section className="space-y-3">
            <h3 className="text-xs uppercase tracking-[0.14em] text-faint">Built with</h3>
            <div className="flex flex-wrap gap-2">{p.technologies.map((t) => <span key={t} className="tag text-[13px]">{t}</span>)}</div>
          </section>
        )}

        {p.downloads.length > 0 && (
          <section className="space-y-3">
            <h3 className="text-xs uppercase tracking-[0.14em] text-faint">Downloads</h3>
            <ul className="space-y-2">
              {p.downloads.map((d) => (
                <li key={d.id} className="card flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm">{d.original_filename}</p>
                    <p className="text-xs text-faint">{formatBytes(d.file_size)}{d.checksum ? ` · SHA-256 ${d.checksum.slice(0, 12)}…` : ""}</p>
                  </div>
                  <a className="btn btn-ghost btn-sm" href={`/api/download/${d.id}`} rel="nofollow">Download</a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {p.releases.length > 0 && (
          <section className="space-y-3">
            <h3 className="text-xs uppercase tracking-[0.14em] text-faint">Release history</h3>
            <ol className="space-y-4 border-l border-line pl-4">
              {p.releases.map((r) => (
                <li key={r.id}>
                  <p className="text-sm"><span className="font-medium text-accent">v{r.version}</span> <span className="text-faint">· {formatDate(r.release_date)}</span></p>
                  {r.release_notes && <p className="mt-1 whitespace-pre-line text-sm text-muted">{r.release_notes}</p>}
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>
    </dialog>
  );
}

export default function Showcase({ data }: { data: ShowcaseData }) {
  const { projects, profile } = data;
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("All");
  const [tech, setTech] = useState<string>("");
  const [sort, setSort] = useState<Sort>("recent");
  const [openSlug, setOpenSlug] = useState<string | null>(null);

  // Shareable deep link: /?p=<slug> opens the overlay without a separate page.
  useEffect(() => {
    const read = () => setOpenSlug(new URLSearchParams(window.location.search).get("p"));
    read();
    window.addEventListener("popstate", read);
    return () => window.removeEventListener("popstate", read);
  }, []);
  const open = useCallback((slug: string) => {
    history.pushState(null, "", `/?p=${encodeURIComponent(slug)}`);
    setOpenSlug(slug);
  }, []);
  const close = useCallback(() => {
    if (new URLSearchParams(window.location.search).get("p")) history.pushState(null, "", "/");
    setOpenSlug(null);
  }, []);

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
      if (!needle) return true;
      return [p.name, p.short_description, p.category, ...p.technologies, ...p.tags].join(" ").toLowerCase().includes(needle);
    });
    return [...list].sort((a, b) =>
      sort === "name" ? a.name.localeCompare(b.name)
        : sort === "oldest" ? +new Date(a.created_on) - +new Date(b.created_on)
        : sort === "newest" ? +new Date(b.created_on) - +new Date(a.created_on)
        : +new Date(b.updated_at) - +new Date(a.updated_at));
  }, [projects, q, cat, tech, sort]);

  const filtersActive = Boolean(q || tech || cat !== "All" || sort !== "recent");
  const resetFilters = () => { setQ(""); setCat("All"); setTech(""); setSort("recent"); };
  const featured = projects.filter((p) => p.is_featured).slice(0, 3);
  const showFeatured = featured.length > 0 && !q && cat === "All" && !tech;
  const recent = [...projects].sort((a, b) => +new Date(b.updated_at) - +new Date(a.updated_at)).slice(0, 3);
  const openProject = openSlug ? projects.find((p) => p.slug === openSlug) ?? null : null;
  const name = profile?.display_name ?? "Creator";

  return (
    <div className="min-h-dvh">
      <BatIntro />
      <header className="sticky top-0 z-20 border-b border-accent/40 bg-ink/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <a href="#top" className="font-display text-lg tracking-tight"><span className="eyes" aria-hidden="true"><i /><i /></span>Ghost<span className="text-accent"> Hub</span></a>
          <nav className="flex items-center gap-5 text-sm text-muted">
            <a href="#work" className="hover:text-text">Work</a>
            <Link href="/studio" className="rounded-[3px] border border-accent/50 px-3 py-1.5 text-[13px] hover:bg-raised hover:text-text">Creator sign in</Link>
          </nav>
        </div>
      </header>

      <main id="top">
        <section className="relative isolate overflow-hidden border-b border-line" aria-labelledby="hero-title">
          <div className="hero-glow absolute inset-0 -z-10" aria-hidden="true" />
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-14 pt-14 sm:px-6 sm:pb-20 sm:pt-24 lg:grid-cols-[1.35fr_1fr]">
            <div>
              <p className="rise flex items-center gap-3 text-xs uppercase tracking-[0.28em] text-accent"><span className="h-px w-10 bg-accent" aria-hidden="true" />Digital headquarters</p>
              <h1 id="hero-title" className="rise glow-text mt-6 max-w-3xl font-display text-[2.5rem] leading-[1.04] tracking-tight sm:text-6xl lg:text-7xl" style={{ animationDelay: "60ms" }}>
                {profile?.headline || "Ghost Hub: things built, shipped and still being tinkered with."}
              </h1>
              <p className="rise mt-6 max-w-xl text-base leading-relaxed text-muted sm:text-lg" style={{ animationDelay: "120ms" }}>
                {profile?.bio || "Android apps, games, websites and AI experiments, collected in one place."}
              </p>
              <div className="rise mt-9 flex flex-wrap items-center gap-3" style={{ animationDelay: "180ms" }}>
                <a href="#work" className="btn btn-primary px-6">Explore the creations <span aria-hidden="true">&darr;</span></a>
                {featured.length > 0 && <a href="#featured" className="btn btn-ghost px-6">Featured</a>}
              </div>
            </div>
            <svg className="ghost-mark rise mx-auto w-56 max-w-full sm:w-72 lg:w-full lg:max-w-sm" viewBox="0 0 320 320" fill="none" aria-hidden="true" style={{ animationDelay: "240ms" }}>
              <circle className="ring" cx="160" cy="160" r="150" stroke="#e0212c" strokeOpacity="0.35" />
              <circle className="ring" cx="160" cy="160" r="112" stroke="#e0212c" strokeOpacity="0.5" />
              <circle className="ring" cx="160" cy="160" r="74" stroke="#e0212c" strokeOpacity="0.7" />
              <path d="M160 6v60M160 254v60M6 160h60M254 160h60" stroke="#2a2a33" />
              <polygon points="92,142 148,154 156,176 138,182 108,174 100,160" fill="#ff1219" />
              <polygon points="228,142 172,154 164,176 182,182 212,174 220,160" fill="#ff1219" />
            </svg>
          </div>
          <dl className="rise mx-auto grid max-w-6xl grid-cols-3 border-t border-accent/30 px-4 sm:px-6" style={{ animationDelay: "300ms" }}>
            <div className="py-5"><dt className="text-[11px] uppercase tracking-[0.16em] text-faint sm:text-xs">Creations</dt><dd className="font-display text-3xl sm:text-4xl">{projects.length}</dd></div>
            <div className="border-l border-line py-5 pl-4 sm:pl-8"><dt className="text-[11px] uppercase tracking-[0.16em] text-faint sm:text-xs">Categories</dt><dd className="font-display text-3xl sm:text-4xl">{categories.length}</dd></div>
            <div className="border-l border-line py-5 pl-4 sm:pl-8"><dt className="text-[11px] uppercase tracking-[0.16em] text-faint sm:text-xs">Technologies</dt><dd className="font-display text-3xl sm:text-4xl">{techs.length}</dd></div>
          </dl>
        </section>

        {!data.configured ? (
          <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
            <div className="card p-6 sm:p-8">
              <h2 className="font-display text-2xl">Setup needed</h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
                The database connection is not configured yet. Add the Supabase URL and publishable key to the environment
                (see <code className="text-text">.env.example</code> and <code className="text-text">docs/SETUP.md</code>), then reload.
              </p>
            </div>
          </section>
        ) : data.error ? (
          <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6"><p className="card p-6 text-sm text-muted" role="alert">{data.error}</p></section>
        ) : (
          <>
            {showFeatured && (
              <section id="featured" className="reveal mx-auto max-w-6xl scroll-mt-16 px-4 pb-14 pt-14 sm:px-6" aria-labelledby="featured-title">
                <h2 id="featured-title" className="mb-5 font-display text-2xl sm:text-3xl">Featured</h2>
                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                  {featured.map((p, i) => <Card key={p.id} p={p} index={i} large onOpen={() => open(p.slug)} />)}
                </div>
              </section>
            )}

            <section id="work" className="mx-auto max-w-6xl scroll-mt-16 px-4 pb-24 pt-4 sm:px-6" aria-labelledby="all-work">
              <h2 id="all-work" className="mb-5 font-display text-2xl sm:text-3xl">All creations</h2>

              <div className="space-y-3">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <input className="field sm:flex-1" type="search" placeholder="Search projects, technologies, tags…" value={q}
                    onChange={(e) => setQ(e.target.value)} aria-label="Search projects" />
                  <select className="field sm:w-48" value={tech} onChange={(e) => setTech(e.target.value)} aria-label="Filter by technology">
                    <option value="">All technologies</option>
                    {techs.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <select className="field sm:w-44" value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort projects">
                    <option value="recent">Recently updated</option>
                    <option value="newest">Newest first</option>
                    <option value="oldest">Oldest first</option>
                    <option value="name">Name A–Z</option>
                  </select>
                </div>
                <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Categories">
                  <button className="chip" aria-pressed={cat === "All"} onClick={() => setCat("All")}>All <span className="ml-1.5 text-faint">{projects.length}</span></button>
                  {categories.map(([c, n]) => (
                    <button key={c} className="chip" aria-pressed={cat === c} onClick={() => setCat(c)}>{c} <span className="ml-1.5 text-faint">{n}</span></button>
                  ))}
                </div>
                {filtersActive && (
                  <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted" role="status">
                    <span>Filters active:</span>
                    {q && <span className="tag">&ldquo;{q}&rdquo;</span>}
                    {cat !== "All" && <span className="tag">{cat}</span>}
                    {tech && <span className="tag">{tech}</span>}
                    {sort !== "recent" && <span className="tag">sorted: {sort}</span>}
                    <button className="text-accent underline-offset-4 hover:underline" onClick={resetFilters}>Reset filters</button>
                  </p>
                )}
              </div>

              {projects.length === 0 ? (
                <div className="card mt-8 p-8 text-center">
                  <p className="font-display text-xl">Nothing is published yet.</p>
                  <p className="mt-2 text-sm text-muted">New creations will appear here as soon as they are published.</p>
                </div>
              ) : filtered.length === 0 ? (
                <div className="card mt-8 p-8 text-center">
                  <p className="font-display text-xl">No matches.</p>
                  <button className="btn btn-ghost btn-sm mt-4" onClick={resetFilters}>Reset filters</button>
                </div>
              ) : (
                <>
                  <p className="mt-6 text-xs text-faint" aria-live="polite">{filtered.length} {filtered.length === 1 ? "creation" : "creations"}</p>
                  <div className="mt-3 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {filtered.map((p, i) => <Card key={p.id} p={p} index={i} onOpen={() => open(p.slug)} />)}
                  </div>
                </>
              )}

              {projects.length > 3 && !q && cat === "All" && !tech && sort === "recent" && (
                <p className="mt-10 text-xs text-faint">Latest activity: {recent.map((r) => r.name).join(" · ")}</p>
              )}
            </section>
          </>
        )}
      </main>

      <footer className="border-t border-accent/30">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-xs text-faint sm:flex-row sm:justify-between sm:px-6">
          <span>© {new Date().getFullYear()} {name}</span>
          <span>Only projects marked public are shown here. <button className="ml-2 underline-offset-4 hover:text-text hover:underline" onClick={() => window.dispatchEvent(new Event("ghost-intro-replay"))}>Replay intro</button></span>
        </div>
      </footer>

      {openProject && <Detail key={openProject.id} p={openProject} onClose={close} />}
    </div>
  );
}
