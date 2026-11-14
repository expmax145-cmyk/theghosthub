import type { Metadata } from "next";
import Page from "@/components/site/Page";

export const metadata: Metadata = { title: "Terms", description: "Terms of use for Ghost Hub and its downloads.", alternates: { canonical: "/terms" } };

export default function Terms() {
  return (
    <Page title="Terms of use" kicker="The small print">
      <p>By using Ghost Hub you agree to these simple terms.</p>
      <h2 className="font-display text-2xl">Content and ownership</h2>
      <p>Projects, text, images and files on this site belong to their creator or to the respective rights holders. You may view and share links to them. Please do not copy or redistribute them without permission.</p>
      <h2 className="font-display text-2xl">Apps, games and downloads</h2>
      <p>Software and files are provided &ldquo;as is&rdquo;, without warranty of any kind. Experimental builds may be unstable. Install and run downloads at your own risk, check the file size and checksum shown on the project page, and keep backups of anything important.</p>
      <h2 className="font-display text-2xl">Acceptable use</h2>
      <p>Do not attempt to disrupt the site, probe it for weaknesses, or access areas that are not public. Report any security problem through the contact page instead.</p>
      <h2 className="font-display text-2xl">Links to other sites</h2>
      <p>External links are provided for convenience. The creator is not responsible for the content or practices of other sites.</p>
      <h2 className="font-display text-2xl">Changes</h2>
      <p>Projects and these terms may change or be removed at any time without notice.</p>
      <p className="text-sm text-faint">Last updated: November 2026.</p>
    </Page>
  );
}
