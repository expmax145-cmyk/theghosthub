import type { Metadata } from "next";
import Page from "@/components/site/Page";
import { CONTACT_EMAIL } from "@/lib/site";

export const metadata: Metadata = { title: "Privacy", description: "What data Ghost Hub does and does not collect.", alternates: { canonical: "/privacy" } };

export default function Privacy() {
  return (
    <Page title="Privacy" kicker="Your data">
      <p>Ghost Hub is a personal showcase. It is built to collect as little as possible.</p>
      <h2 className="font-display text-2xl">What visitors share</h2>
      <p>There are no visitor accounts, no tracking cookies, no advertising and no analytics scripts on this site. Browsing the showcase does not ask you for any personal information.</p>
      <h2 className="font-display text-2xl">What is stored in your browser</h2>
      <p>A small note in your browser&rsquo;s local storage remembers that you have already seen the intro animation, so it is not shown on every visit. It never leaves your device and you can clear it at any time.</p>
      <h2 className="font-display text-2xl">Server logs</h2>
      <p>The hosting provider (Vercel) and the database provider (Supabase) keep standard technical logs, such as IP address and request time, for security and operation of the service. Those logs are governed by their own privacy policies.</p>
      <h2 className="font-display text-2xl">Downloads and external links</h2>
      <p>Downloads are served from private storage through short-lived links. Links to demos, source code and other sites lead to services with their own privacy practices.</p>
      <h2 className="font-display text-2xl">The creator sign-in</h2>
      <p>The creator area is for the site owner only and uses secure session cookies to keep the owner signed in. Visitors do not need and cannot create accounts.</p>
      <h2 className="font-display text-2xl">Questions</h2>
      <p>{CONTACT_EMAIL ? <>Write to <a className="text-accent hover:underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</> : <>Use the contact page once details are published.</>}</p>
      <p className="text-sm text-faint">Last updated: November 2026. Individual apps may have their own privacy policy, linked on their project page.</p>
    </Page>
  );
}
