import { ImageResponse } from "next/og";

export const alt = "Ghost Hub: a personal digital headquarters";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 90, background: "radial-gradient(circle at 80% 40%, #3a0a10 0%, #040407 60%)", color: "#f0e9df" }}>
        <div style={{ display: "flex", gap: 16, marginBottom: 36 }}>
          <div style={{ width: 70, height: 26, background: "#ff1219", borderRadius: 14, boxShadow: "0 0 40px #e0212c" }} />
          <div style={{ width: 70, height: 26, background: "#ff1219", borderRadius: 14, boxShadow: "0 0 40px #e0212c" }} />
        </div>
        <div style={{ fontSize: 112, letterSpacing: 18, fontWeight: 700, display: "flex" }}>GHOST HUB</div>
        <div style={{ fontSize: 34, color: "#a8a3a0", marginTop: 20, display: "flex" }}>Apps, games, websites and experiments.</div>
        <div style={{ height: 2, width: 260, background: "#e0212c", marginTop: 44, display: "flex" }} />
      </div>
    ),
    size,
  );
}
