import Link from "next/link";
import { NAV } from "@/lib/site";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";
import PaletteButton from "./PaletteButton";
import SoundToggle from "./SoundToggle";

export default function SiteHeader({ wide = false }: { wide?: boolean }) {
  return (
    <header className="site-header sticky top-0 z-20 border-b border-line/70 bg-ink/70 backdrop-blur-xl">
      <div className={`mx-auto flex h-14 ${wide ? "max-w-[1500px]" : "max-w-6xl"} items-center justify-between gap-3 px-4 sm:px-6`}>
        <Logo />
        <nav aria-label="Main" className="flex items-center gap-2 text-sm font-medium text-muted sm:gap-5">
          {NAV.map((n) => <Link key={n.href} href={n.href} className="nav-link hover:text-text hidden sm:inline">{n.label}</Link>)}
          <Link href="/studio" className="btn btn-ghost btn-sm hidden whitespace-nowrap sm:inline-flex">
            Creator sign in
          </Link>
          <PaletteButton />
          <SoundToggle />
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
