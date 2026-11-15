import Link from "next/link";
import { CONTACT_EMAIL } from "@/lib/site";
import FooterBat from "./FooterBat";

export default function SiteFooter({ owner = "Ghost Hub", children }: { owner?: string; children?: React.ReactNode }) {
  return (
    <footer className="cave-floor relative border-t border-accent/30">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-xs text-faint sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <span className="flex items-center gap-3"><FooterBat />&copy; {new Date().getFullYear()} {owner}</span>
        <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <Link href="/about" className="hover:text-text">About</Link>
          <Link href="/contact" className="hover:text-text">Contact</Link>
          <Link href="/privacy" className="hover:text-text">Privacy</Link>
          <Link href="/terms" className="hover:text-text">Terms</Link>
          {CONTACT_EMAIL && <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-text">{CONTACT_EMAIL}</a>}
          {children}
        </nav>
      </div>
    </footer>
  );
}
