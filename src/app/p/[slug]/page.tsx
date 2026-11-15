import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadShowcase } from "@/lib/showcase";
import { SITE } from "@/lib/site";
import { STATUS_LABEL } from "@/lib/types";
import { formatBytes, formatDate, safeUrl } from "@/lib/utils";
import { kindOf, latestApk } from "@/lib/kind";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";

// Signed media URLs expire, and unpublishing must take effect at once.
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

async function find(slug: string) {
  const data = await loadShowcase();
  return { data, project: data.projects.find((p) => p.slug === slug) ?? null };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { project } = await find(slug);
  if (!project) return { title: "Not found", robots: { index: false } };
  const description = project.short_description || `${project.name}: a ${project.category.toLowerCase()} project on Ghost Hub.`;
  return {
    title: project.name,
    description,
    alternates: { canonical: `/p/${project.slug}` },
    openGraph: { type: "article", title: project.name, description, url: `/p/${project.slug}` },
    twitter: { card: "summary_large_image", title: project.name, description },
  };
}

const H = "text-xs uppercase tracking-[0.14em] text-faint";

export default async function ProjectPage({ params }: Props) {
  const { slug } = await params;
  const { data, project: p } = await find(slug);
  if (!p) notFound();

  const demo = safeUrl(p.live_demo_url);
  const repo = safeUrl(p.public_repository_url);
  const video = safeUrl(p.video_url);
  const links = (p.extra_links ?? []).map((l) => ({ label: l.label, url: safeUrl(l.url) })).filter((l) => l.url);
  const shots = p.screenshots.filter((s) => s.url);
  const hero = p.thumb ?? shots[0]?.url ?? null;
  const apk = latestApk(p);
  const kind = kindOf(p);
  const latest = p.releases[0] ?? null;
  const visitLabel = kind === "game" ? "Play now \u25b6" : kind === "website" ? "Visit website \u2197" : "Open live demo \u2197";
  const others = apk ? p.downloads.filter((d) => d.id !== apk.id) : p.downloads;
  const developer = data.profile?.display_name || "Ghost Hub";
  const related = data.projects.filter((x) => x.id !== p.id && x.category === p.category).slice(0, 3);

  // Structured data only from fields that exist; nothing is invented.
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CreativeWork",
        name: p.name,
        description: p.short_description || undefined,
        url: `${SITE}/p/${p.slug}`,
        genre: p.category,
        keywords: [...p.technologies, ...p.tags].join(", ") || undefined,
        dateCreated: p.created_on || undefined,
        dateModified: p.updated_at,
        sameAs: [demo, repo].filter(Boolean),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Ghost Hub", item: SITE },
          { "@type": "ListItem", position: 2, name: p.name, item: `${SITE}/p/${p.slug}` },
        ],
      },
    ],
  };

  const gallery = (
    shots.length > 0 && (
      <section className="space-y-3" aria-labelledby="gl">
        <h2 id="gl" className={H}>{apk ? "Screenshots" : "Gallery"}</h2>
        {apk ? (
          <div className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 sm:mx-0 sm:px-0" tabIndex={0} aria-label="Screenshots, scroll sideways">
            {shots.map((s, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={s.id} src={s.url!} alt={`${p.name} screenshot ${i + 1}`} loading={i < 2 ? "eager" : "lazy"} decoding="async" className="lit h-72 w-auto shrink-0 snap-start rounded-[8px] border border-line bg-surface object-contain sm:h-96" />
            ))}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {shots.map((s, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={s.id} src={s.url!} alt={`${p.name} screenshot ${i + 1}`} loading="lazy" decoding="async" className="lit w-full rounded-[4px] border border-line bg-surface object-contain" />
            ))}
          </div>
        )}
      </section>
    )
  );

  return (
    <div className="min-h-dvh">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />
      <SiteHeader />
      <main id="main" className="mx-auto max-w-4xl space-y-10 px-4 pb-24 pt-8 sm:px-6 sm:pt-12">
        <nav aria-label="Breadcrumb" className="text-xs text-faint">
          <Link href="/" className="hover:text-text">Ghost Hub</Link> <span aria-hidden="true">/</span>{" "}
          <Link href={`/?cat=${encodeURIComponent(p.category)}#work`} className="hover:text-text">{p.category}</Link>
        </nav>

        {apk ? (
          <header className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <div className="h-28 w-28 shrink-0 overflow-hidden rounded-[22px] border border-accent/50 bg-surface shadow-[0_0_30px_rgba(224,33,44,0.2)] sm:h-36 sm:w-36">
              {p.thumb ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.thumb} alt={`${p.name} icon`} className="h-full w-full object-cover" fetchPriority="high" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(120%_120%_at_20%_10%,#1a0508,#050509)] font-display text-4xl text-accent/80">{p.name.slice(0, 2).toUpperCase()}</div>
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-4">
              <div>
                <h1 className="font-display text-3xl leading-tight tracking-tight sm:text-5xl">{p.name}</h1>
                <p className="mt-1 text-sm text-accent">{developer}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.14em] text-faint">{p.category} &middot; {STATUS_LABEL[p.status]}</p>
              </div>
              <dl className="grid max-w-md grid-cols-3 divide-x divide-line text-center">
                <div className="px-2"><dd className="text-sm font-medium">{formatBytes(apk.file_size)}</dd><dt className="text-[11px] text-faint">Size</dt></div>
                <div className="px-2"><dd className="text-sm font-medium">{latest ? `v${latest.version}` : "\u2014"}</dd><dt className="text-[11px] text-faint">Version</dt></div>
                <div className="px-2"><dd className="text-sm font-medium">{formatDate(latest?.release_date ?? apk.created_at)}</dd><dt className="text-[11px] text-faint">Updated</dt></div>
              </dl>
              <div className="flex flex-wrap gap-2">
                <a className="btn btn-primary min-h-12 px-8 text-base" href={`/api/download/${apk.id}`} rel="nofollow">Install &middot; Download APK</a>
                {demo && <a className="btn btn-ghost min-h-12" href={`/go/${p.slug}`}>{visitLabel}</a>}
                {repo && <a className="btn btn-ghost min-h-12" href={repo} target="_blank" rel="noopener noreferrer">Source code &#8599;</a>}
                {video && <a className="btn btn-ghost min-h-12" href={video} target="_blank" rel="noopener noreferrer">Watch demo &#8599;</a>}
                {links.map((l) => <a key={l.label + l.url} className="btn btn-ghost min-h-12" href={l.url!} target="_blank" rel="noopener noreferrer">{l.label} &#8599;</a>)}
              </div>
              <p className="text-xs text-faint">Android &middot; APK file &middot; free direct download from the developer</p>
            </div>
          </header>
        ) : (
          <header className="space-y-4">
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs uppercase tracking-[0.14em] text-faint">
              <span>{p.category}</span><span className="text-sage">{STATUS_LABEL[p.status]}</span>
              {p.is_featured && <span className="text-accent">&#9733; Featured</span>}
            </p>
            <h1 className="font-display text-4xl leading-tight tracking-tight sm:text-6xl">{p.name}</h1>
            {p.short_description && <p className="max-w-2xl text-lg leading-relaxed text-muted">{p.short_description}</p>}
            <div className="flex flex-wrap gap-2 pt-1">
              {demo && <a className="btn btn-primary min-h-12 px-8 text-base" href={`/go/${p.slug}`}>{visitLabel}</a>}
              {repo && <a className="btn btn-ghost min-h-12" href={repo} target="_blank" rel="noopener noreferrer">Source code &#8599;</a>}
              {video && <a className="btn btn-ghost min-h-12" href={video} target="_blank" rel="noopener noreferrer">Watch demo &#8599;</a>}
              {links.map((l) => <a key={l.label + l.url} className="btn btn-ghost min-h-12" href={l.url!} target="_blank" rel="noopener noreferrer">{l.label} &#8599;</a>)}
            </div>
          </header>
        )}

        {apk && p.short_description && <p className="max-w-2xl text-lg leading-relaxed text-muted">{p.short_description}</p>}

        {apk && gallery}

        {!apk && hero && (
          <div className="card card-major overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={hero} alt={`${p.name} cover`} className="lit max-h-[70vh] w-full object-cover" fetchPriority="high" />
          </div>
        )}

        {apk && latest && (
          <section className="space-y-3" aria-labelledby="wn">
            <h2 id="wn" className={H}>What&rsquo;s new &middot; v{latest.version}</h2>
            <p className="whitespace-pre-line text-sm leading-relaxed text-text/90">{latest.release_notes || "Bug fixes and improvements."}</p>
          </section>
        )}

        {p.description && (
          <section className="space-y-3" aria-labelledby="ov">
            <h2 id="ov" className={H}>Overview</h2>
            <div className="prose-hub text-base text-text/90">{p.description.split(/\n{2,}/).map((t, i) => <p key={i} className="whitespace-pre-line">{t}</p>)}</div>
          </section>
        )}

        {p.features.length > 0 && (
          <section className="space-y-3" aria-labelledby="ft">
            <h2 id="ft" className={H}>Features</h2>
            <ul className="grid gap-2 sm:grid-cols-2">{p.features.map((f) => <li key={f} className="flex gap-2 text-sm text-muted"><span className="text-accent" aria-hidden="true">&#9656;</span>{f}</li>)}</ul>
          </section>
        )}

        {p.technologies.length > 0 && (
          <section className="space-y-3" aria-labelledby="tc">
            <h2 id="tc" className={H}>Built with</h2>
            <div className="flex flex-wrap gap-2">{p.technologies.map((t) => <span key={t} className="tag text-[13px]">{t}</span>)}</div>
          </section>
        )}

        {!apk && gallery}

        {p.videos.filter((v) => v.url).map((v) => (
          <video key={v.id} src={v.url!} controls preload="metadata" playsInline className="w-full rounded-[4px] border border-line bg-black" />
        ))}

        {apk && (
          <section className="space-y-4" aria-labelledby="ins">
            <h2 id="ins" className={H}>Install &amp; safety</h2>
            <details className="card p-4">
              <summary className="cursor-pointer text-sm">How to install this APK</summary>
              <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-muted">
                <li>Tap <strong className="text-text">Install &middot; Download APK</strong> and wait for the file to finish downloading.</li>
                <li>Open the downloaded file. If Android asks, allow your browser to <em>install unknown apps</em> (Settings &rarr; Apps &rarr; Special access).</li>
                <li>Tap <strong className="text-text">Install</strong>, then <strong className="text-text">Open</strong>.</li>
              </ol>
            </details>
            <div className="card space-y-2 p-4 text-sm text-muted">
              <p>This app is shared directly by its developer and is <strong className="text-text">not distributed through Google Play</strong>, so Android may show a warning. Install only if you trust the source.</p>
              {apk.checksum ? (
                <p className="break-all text-xs"><span className="text-faint">SHA-256 </span><code className="text-text/90">{apk.checksum}</code></p>
              ) : null}
              <p className="text-xs text-faint">File: {apk.original_filename} &middot; {formatBytes(apk.file_size)}. See the <Link href="/terms" className="underline-offset-4 hover:underline">terms</Link> and <Link href="/privacy" className="underline-offset-4 hover:underline">privacy</Link> pages.</p>
            </div>
          </section>
        )}

        {others.length > 0 && (
          <section className="space-y-3" aria-labelledby="dl">
            <h2 id="dl" className={H}>{apk ? "More downloads" : "Downloads"}</h2>
            <ul className="space-y-2">
              {others.map((d) => (
                <li key={d.id} className="card flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm">{d.original_filename}</p>
                    <p className="text-xs text-faint">{formatBytes(d.file_size)}{d.checksum ? ` \u00b7 SHA-256 ${d.checksum.slice(0, 12)}\u2026` : ""}</p>
                  </div>
                  <a className="btn btn-ghost btn-sm" href={`/api/download/${d.id}`} rel="nofollow">Download</a>
                </li>
              ))}
            </ul>
            {!apk && <p className="text-xs text-faint">Downloads are provided as is. See the <Link href="/terms" className="underline-offset-4 hover:underline">terms</Link>.</p>}
          </section>
        )}

        {p.releases.length > 0 && (
          <section className="space-y-3" aria-labelledby="rl">
            <h2 id="rl" className={H}>Release history</h2>
            <ol className="space-y-4 border-l border-line pl-4">
              {p.releases.map((r) => (
                <li key={r.id}>
                  <p className="text-sm"><span className="font-medium text-accent">v{r.version}</span> <span className="text-faint">&middot; {formatDate(r.release_date)}</span></p>
                  {r.release_notes && <p className="mt-1 whitespace-pre-line text-sm text-muted">{r.release_notes}</p>}
                </li>
              ))}
            </ol>
          </section>
        )}

        <p className="border-t border-line pt-4 text-xs text-faint">Created {formatDate(p.created_on)} &middot; Last updated {formatDate(p.updated_at)}</p>

        {related.length > 0 && (
          <section className="space-y-3" aria-labelledby="rel">
            <h2 id="rel" className={H}>More in {p.category}</h2>
            <ul className="grid gap-3 sm:grid-cols-3">
              {related.map((r) => <li key={r.id}><Link href={`/p/${r.slug}`} prefetch={false} className="card block p-4 hover:border-accent/70"><span className="font-display text-lg">{r.name}</span></Link></li>)}
            </ul>
          </section>
        )}
      </main>
      <SiteFooter owner={data.profile?.display_name} />
    </div>
  );
}
