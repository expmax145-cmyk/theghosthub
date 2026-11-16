import Link from "next/link";
import { NAV } from "@/lib/site";

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-ink/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" className="shrink-0 font-display text-lg tracking-tight">Ghost<span className="text-accent"> Hub</span></Link>
        <nav aria-label="Main" className="flex items-center gap-3 text-sm text-muted sm:gap-5">
          {NAV.map((n) => <Link key={n.href} href={n.href} className={`hover:text-text ${n.label === "About" ? "" : "hidden sm:inline"}`}>{n.label}</Link>)}
          <Link href="/studio" className="whitespace-nowrap rounded-[3px] border border-line px-3 py-1.5 text-[13px] hover:border-accent/60 hover:bg-raised hover:text-text">
            <span className="sm:hidden">Sign in</span><span className="hidden sm:inline">Creator sign in</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
