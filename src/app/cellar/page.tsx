import type { Metadata } from "next";
import Page from "@/components/site/Page";
import Achievements from "@/components/site/Achievements";

export const metadata: Metadata = { title: "The Cellar", robots: { index: false, follow: false } };

export default function Cellar() {
  return (
    <Page title="The Cellar" kicker="Hidden room">
      <p>You found the room behind the logo. Few visitors do. The bats here are old, and they remember everyone who comes down.</p>
      <p>Below is everything the cave has noticed about you. It is stored only in this browser.</p>
      <Achievements />
    </Page>
  );
}
