import Link from "next/link";
import { NAV } from "@/lib/site";

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-accent/40 bg-ink/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="font-display text-lg tracking-tight">
          <span className="eyes" aria-hidden="true"><i /><i /></span>Ghost<span className="text-accent"> Hub</span>
        </Link>
        <nav aria-label="Main" className="flex items-center gap-4 text-sm text-muted sm:gap-5">
          {NAV.map((n) => <Link key={n.href} href={n.href} className="hover:text-text">{n.label}</Link>)}
          <Link href="/studio" className="rounded-[3px] border border-accent/50 px-3 py-1.5 text-[13px] hover:bg-raised hover:text-text">
            <span className="sm:hidden">Sign in</span><span className="hidden sm:inline">Creator sign in</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
