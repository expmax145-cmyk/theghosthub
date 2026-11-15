import type { Metadata, Viewport } from "next";
import "./globals.css";
import CaveAtmosphere from "@/components/site/CaveAtmosphere";

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
export const viewport: Viewport = { themeColor: "#040407", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Returning visitors and reduced-motion users never see the intro layer, even before scripts finish loading. */}
        <script dangerouslySetInnerHTML={{ __html: 'try{var t=+localStorage.getItem("ghosthub-intro-seen");if((t>0&&Date.now()-t<12096e5)||matchMedia("(prefers-reduced-motion: reduce)").matches)document.documentElement.setAttribute("data-intro-seen","1")}catch(e){}' }} />
      </head>
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[200] focus:rounded-[3px] focus:bg-accent focus:px-4 focus:py-2 focus:text-white">Skip to content</a>
        <CaveAtmosphere />
        {children}
      </body>
    </html>
  );
}
