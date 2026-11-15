import { NextResponse, type NextRequest } from "next/server";
import { loadShowcase } from "@/lib/showcase";
import { safeUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * Sends the visitor to the live website of a published project.
 * Only the URL the owner saved on that project can be the destination, and only http(s) is allowed,
 * so this is not an open redirect.
 */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return new NextResponse("Not found", { status: 404 });
  const { projects } = await loadShowcase();
  const url = safeUrl(projects.find((p) => p.slug === slug)?.live_demo_url);
  if (!url) return new NextResponse("Not found", { status: 404 });
  const res = NextResponse.redirect(url, 307);
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("X-Robots-Tag", "noindex");
  return res;
}
