import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Ghost Hub", template: "%s · Ghost Hub" },
  description: "Ghost Hub: apps, games, websites and experiments.",
};
export const viewport: Viewport = { themeColor: "#0d0d0f", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
