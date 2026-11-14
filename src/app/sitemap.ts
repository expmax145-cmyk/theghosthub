import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://theghosthub.vercel.app";

// Projects open as an overlay on the home page, so the home page is the only indexable URL.
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: SITE, changeFrequency: "weekly", priority: 1 }];
}
