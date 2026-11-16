import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ghost Hub",
    short_name: "Ghost Hub",
    description: "A personal digital headquarters for apps, games, websites and experiments.",
    start_url: "/",
    display: "standalone",
    background_color: "#0e1116",
    theme_color: "#0e1116",
    icons: [{ src: "/icon", sizes: "64x64", type: "image/png" }],
  };
}
