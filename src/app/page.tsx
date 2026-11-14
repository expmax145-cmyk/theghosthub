import { loadShowcase } from "@/lib/showcase";
import Showcase from "@/components/showcase/Showcase";

// Always rendered per request: signed media URLs are short-lived and unpublishing must take effect immediately.
export const dynamic = "force-dynamic";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://theghosthub.vercel.app";

export default async function Page() {
  const data = await loadShowcase();
  // Structured data comes only from published projects; nothing is invented.
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebSite", name: "Ghost Hub", url: SITE },
      ...(data.projects.length
        ? [{ "@type": "ItemList", name: "Ghost Hub creations", itemListElement: data.projects.map((p, i) => ({ "@type": "ListItem", position: i + 1, name: p.name, url: `${SITE}/?p=${encodeURIComponent(p.slug)}` })) }]
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
