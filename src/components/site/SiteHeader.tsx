import Link from "next/link";
import { NAV } from "@/lib/site";
import Logo from "./Logo";
import CaveControls from "./CaveControls";

export default function SiteHeader() {
  return (
    <header className="cave-header sticky top-0 z-20 border-b border-accent/40 bg-ink/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Logo />
        <nav aria-label="Main" className="flex items-center gap-2.5 text-sm text-muted sm:gap-5">
          {NAV.map((n) => <Link key={n.href} href={n.href} className={`torch-link hover:text-text ${n.label === "About" ? "" : "hidden sm:inline"}`}>{n.label}</Link>)}
          <Link href="/studio" className="whitespace-nowrap rounded-[3px] border border-accent/50 px-3 py-1.5 text-[13px] hover:bg-raised hover:text-text">
            <span className="sm:hidden">Sign in</span><span className="hidden sm:inline">Creator sign in</span>
          </Link>
          <CaveControls />
        </nav>
      </div>
    </header>
  );
}
