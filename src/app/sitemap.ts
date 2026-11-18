import type { MetadataRoute } from "next";
import { loadShowcase } from "@/lib/showcase";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { projects } = await loadShowcase();
  return [
    { url: SITE, changeFrequency: "weekly", priority: 1 },
    ...["explore", "arcade", "about", "contact", "privacy", "terms"].map((p) => ({ url: `${SITE}/${p}`, changeFrequency: "yearly" as const, priority: 0.4 })),
    ...projects.map((p) => ({ url: `${SITE}/p/${p.slug}`, lastModified: p.updated_at, changeFrequency: "monthly" as const, priority: 0.8 })),
  ];
}
