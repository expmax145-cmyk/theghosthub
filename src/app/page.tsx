import { loadShowcase } from "@/lib/showcase";
import Showcase from "@/components/showcase/Showcase";

// Always rendered per request: signed media URLs are short-lived and unpublishing must take effect immediately.
export const dynamic = "force-dynamic";

export default async function Page() {
  const data = await loadShowcase();
  return <Showcase data={data} />;
}
