import Link from "next/link";
import Page from "@/components/site/Page";

export default function NotFound() {
  return (
    <Page title="Page not found." kicker="Error 404">
      <p>The page you were looking for does not exist, was moved, or is not published.</p>
      <p><Link href="/" className="btn btn-primary">Back to Ghost Hub</Link></p>
    </Page>
  );
}
