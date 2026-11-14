import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";

/** Shared frame for the simple content pages. */
export default function Page({ title, kicker, children }: { title: string; kicker?: string; children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <SiteHeader />
      <main id="main" className="mx-auto max-w-3xl px-4 pb-24 pt-14 sm:px-6 sm:pt-20">
        {kicker && <p className="flex items-center gap-3 text-xs uppercase tracking-[0.28em] text-accent"><span className="h-px w-10 bg-accent" aria-hidden="true" />{kicker}</p>}
        <h1 className="mt-5 font-display text-4xl leading-tight tracking-tight sm:text-5xl">{title}</h1>
        <div className="prose-hub mt-8 space-y-5 text-[15px] leading-relaxed text-text/90 sm:text-base">{children}</div>
      </main>
      <SiteFooter />
    </div>
  );
}
