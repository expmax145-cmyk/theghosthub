import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadShowcase } from "@/lib/showcase";
import { SITE } from "@/lib/site";
import { STATUS_LABEL } from "@/lib/types";
import { formatBytes, formatDate, safeUrl } from "@/lib/utils";
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

  return (
    <div className="min-h-dvh">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />
      <SiteHeader />
      <main id="main" className="mx-auto max-w-4xl space-y-10 px-4 pb-24 pt-8 sm:px-6 sm:pt-12">
        <nav aria-label="Breadcrumb" className="text-xs text-faint">
          <Link href="/" className="hover:text-text">Ghost Hub</Link> <span aria-hidden="true">/</span>{" "}
          <Link href={`/?cat=${encodeURIComponent(p.category)}#work`} className="hover:text-text">{p.category}</Link>
        </nav>

        <header className="space-y-4">
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs uppercase tracking-[0.14em] text-faint">
            <span>{p.category}</span><span className="text-sage">{STATUS_LABEL[p.status]}</span>
            {p.is_featured && <span className="text-accent">&#9733; Featured</span>}
          </p>
          <h1 className="font-display text-4xl leading-tight tracking-tight sm:text-6xl">{p.name}</h1>
          {p.short_description && <p className="max-w-2xl text-lg leading-relaxed text-muted">{p.short_description}</p>}
          <div className="flex flex-wrap gap-2 pt-1">
            {demo && <a className="btn btn-primary" href={demo} target="_blank" rel="noopener noreferrer">Open live demo &#8599;</a>}
            {repo && <a className="btn btn-ghost" href={repo} target="_blank" rel="noopener noreferrer">Source code &#8599;</a>}
            {video && <a className="btn btn-ghost" href={video} target="_blank" rel="noopener noreferrer">Watch demo &#8599;</a>}
            {links.map((l) => <a key={l.label + l.url} className="btn btn-ghost" href={l.url!} target="_blank" rel="noopener noreferrer">{l.label} &#8599;</a>)}
          </div>
        </header>

        {hero && (
          <div className="card card-major overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={hero} alt={`${p.name} cover`} className="max-h-[70vh] w-full object-cover" fetchPriority="high" />
          </div>
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

        {shots.length > 0 && (
          <section className="space-y-3" aria-labelledby="gl">
            <h2 id="gl" className={H}>Gallery</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {shots.map((s, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={s.id} src={s.url!} alt={`${p.name} screenshot ${i + 1}`} loading="lazy" decoding="async" className="w-full rounded-[4px] border border-line bg-surface object-contain" />
              ))}
            </div>
          </section>
        )}

        {p.videos.filter((v) => v.url).map((v) => (
          <video key={v.id} src={v.url!} controls preload="metadata" playsInline className="w-full rounded-[4px] border border-line bg-black" />
        ))}

        {p.downloads.length > 0 && (
          <section className="space-y-3" aria-labelledby="dl">
            <h2 id="dl" className={H}>Downloads</h2>
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
            <p className="text-xs text-faint">Downloads are provided as is. See the <Link href="/terms" className="underline-offset-4 hover:underline">terms</Link>.</p>
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
              {related.map((r) => <li key={r.id}><Link href={`/p/${r.slug}`} className="card block p-4 hover:border-accent/70"><span className="font-display text-lg">{r.name}</span></Link></li>)}
            </ul>
          </section>
        )}
      </main>
      <SiteFooter owner={data.profile?.display_name} />
    </div>
  );
}
