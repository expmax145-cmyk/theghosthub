import type { Metadata, Viewport } from "next";
import "./globals.css";
import BackToTop from "@/components/site/BackToTop";
import CommandPalette from "@/components/site/CommandPalette";
import Interactions from "@/components/site/Interactions";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://theghosthub.vercel.app";
const DESCRIPTION = "Ghost Hub is a personal digital headquarters: Android apps, browser games, websites and AI experiments, all in one place.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: "Ghost Hub", template: "%s · Ghost Hub" },
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: { type: "website", siteName: "Ghost Hub", title: "Ghost Hub", description: DESCRIPTION, url: "/" },
  twitter: { card: "summary_large_image", title: "Ghost Hub", description: DESCRIPTION },
};
export const viewport: Viewport = { themeColor: "#06101c", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Apply the saved (or system) theme before first paint so there is no flash. */}
        <script dangerouslySetInnerHTML={{ __html: 'try{var d=document.documentElement;d.classList.add("js");if(sessionStorage.getItem("ghosthub-intro-v2")==="1"||matchMedia("(prefers-reduced-motion: reduce)").matches)d.setAttribute("data-intro-seen","1");var t=localStorage.getItem("ghosthub-theme");if(!t)t=matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";d.dataset.theme=t;var m=document.querySelector(\'meta[name="theme-color"]\');if(m)m.setAttribute("content",t==="dark"?"#06101c":"#f0f7fd")}catch(e){}' }} />
      </head>
      <body>
        <div className="progress" aria-hidden="true" />
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[200] focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-ink">Skip to content</a>
        {children}
        <BackToTop />
        <CommandPalette />
        <Interactions />
      </body>
    </html>
  );
}
