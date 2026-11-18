export const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://theghosthub.vercel.app";
/** Public contact address. Set NEXT_PUBLIC_CONTACT_EMAIL in the hosting environment; nothing is shown if it is unset. */
export const CONTACT_EMAIL = (process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "").trim();
export const NAV = [
  { href: "/#work", label: "Work" },
  { href: "/explore", label: "Explore" },
  { href: "/arcade", label: "Arcade" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];
