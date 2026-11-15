import Link from "next/link";
import Page from "@/components/site/Page";

export default function NotFound() {
  return (
    <Page title="You're lost in the cave." kicker="Error 404">
      <p>The passage you were looking for collapsed long ago, was never dug, or is not published yet. Something is breathing nearby, so it&rsquo;s best not to wander.</p>
      <p><Link href="/" className="btn btn-primary">Find the way back</Link></p>
    </Page>
  );
}
