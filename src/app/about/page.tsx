import type { Metadata } from "next";
import Link from "next/link";
import Page from "@/components/site/Page";
import { loadShowcase } from "@/lib/showcase";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "About", description: "What Ghost Hub is and who is behind it.", alternates: { canonical: "/about" } };

export default async function About() {
  const { profile, projects } = await loadShowcase();
  const cats = new Set(projects.map((p) => p.category)).size;
  return (
    <Page title={profile?.display_name ? `About ${profile.display_name}` : "About Ghost Hub"} kicker="About">
      <p>{profile?.bio || "Ghost Hub is a personal digital headquarters: a single place for the Android apps, browser games, websites and AI experiments I build, with their latest versions, screenshots and downloads."}</p>
      <p>Everything shown here is published by its owner. Drafts and private files are never visible to visitors, and downloads are served through short-lived links.</p>
      {projects.length > 0 && <p>Right now there {projects.length === 1 ? "is" : "are"} <strong>{projects.length}</strong> published {projects.length === 1 ? "creation" : "creations"} across <strong>{cats}</strong> {cats === 1 ? "category" : "categories"}.</p>}
      <p className="flex flex-wrap gap-3 pt-2">
        <Link href="/#work" className="btn btn-primary">See the work</Link>
        <Link href="/contact" className="btn btn-ghost">Get in touch</Link>
      </p>
    </Page>
  );
}
