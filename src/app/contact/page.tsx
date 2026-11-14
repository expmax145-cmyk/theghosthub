import type { Metadata } from "next";
import Page from "@/components/site/Page";
import { CONTACT_EMAIL } from "@/lib/site";

export const metadata: Metadata = { title: "Contact", description: "How to reach the person behind Ghost Hub.", alternates: { canonical: "/contact" } };

export default function Contact() {
  return (
    <Page title="Contact" kicker="Say hello">
      {CONTACT_EMAIL ? (
        <>
          <p>For questions, bug reports, feature requests or collaboration, email:</p>
          <p><a className="font-display text-2xl text-accent underline-offset-4 hover:underline sm:text-3xl" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></p>
          <p className="text-muted">Mention the project name and, for bugs, your device and browser.</p>
        </>
      ) : (
        <p>Contact details have not been published yet. Please check back soon.</p>
      )}
    </Page>
  );
}
