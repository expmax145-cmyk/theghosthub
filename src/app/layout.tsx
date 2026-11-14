import type { Metadata, Viewport } from "next";
import "./globals.css";

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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
