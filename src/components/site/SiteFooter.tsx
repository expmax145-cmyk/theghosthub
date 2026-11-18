import Link from "next/link";
import { CONTACT_EMAIL } from "@/lib/site";
import Logo from "./Logo";
import ReplayIntro from "./ReplayIntro";

export default function SiteFooter({ owner = "Ghost Hub", wide = false, children }: { owner?: string; wide?: boolean; children?: React.ReactNode }) {
  return (
    <footer className="relative mt-8 border-t border-line">
      <div className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-accent/60 to-transparent" aria-hidden="true" />
      <div className={`mx-auto grid ${wide ? "max-w-[1500px]" : "max-w-6xl"} gap-8 px-4 py-10 text-sm sm:grid-cols-[1.4fr_1fr] sm:px-6`}>
        <div className="space-y-3">
          <Logo />
          <p className="max-w-sm text-sm leading-relaxed text-muted">Games, apps, websites and experiments, all in one place. Hover to preview, tap to play, install or visit.</p>
          <p className="text-xs text-faint">&copy; {new Date().getFullYear()} {owner}</p>
        </div>
        <nav aria-label="Footer" className="grid grid-cols-2 content-start gap-x-6 gap-y-2.5 text-sm text-muted">
          <Link href="/about" className="hover:text-text">About</Link>
          <Link href="/privacy" className="hover:text-text">Privacy</Link>
          <Link href="/contact" className="hover:text-text">Contact</Link>
          <Link href="/terms" className="hover:text-text">Terms</Link>
          {CONTACT_EMAIL && <a href={`mailto:${CONTACT_EMAIL}`} className="col-span-2 break-all hover:text-text">{CONTACT_EMAIL}</a>}
          <Link href="/studio" className="hover:text-text">Creator sign in</Link>
          <ReplayIntro />
          {children}
        </nav>
      </div>
    </footer>
  );
}
