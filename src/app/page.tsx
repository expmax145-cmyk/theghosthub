import { redirect } from "next/navigation";
import { loadShowcase } from "@/lib/showcase";
import Showcase from "@/components/showcase/Showcase";
import { SITE } from "@/lib/site";

// Always rendered per request: signed media URLs are short-lived and unpublishing must take effect immediately.
export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const { p } = await searchParams;
  // Old overlay links (/?p=slug) now live at /p/slug.
  if (p && /^[a-z0-9-]{1,80}$/.test(p)) redirect(`/p/${p}`);
  const data = await loadShowcase();
  // Structured data comes only from published projects; nothing is invented.
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebSite", name: "Ghost Hub", url: SITE },
      ...(data.projects.length
        ? [{ "@type": "ItemList", name: "Ghost Hub creations", itemListElement: data.projects.map((x, i) => ({ "@type": "ListItem", position: i + 1, name: x.name, url: `${SITE}/p/${x.slug}` })) }]
        : []),
    ],
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />
      <Showcase data={data} />
    </>
  );
}
