import { ImageResponse } from "next/og";

export const alt = "Ghost Hub: a personal digital headquarters";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 90, background: "linear-gradient(135deg, #1d2a44 0%, #0e1116 65%)", color: "#eceff4" }}>
        <div style={{ fontSize: 112, fontWeight: 700, display: "flex" }}>Ghost Hub</div>
        <div style={{ fontSize: 36, color: "#a9b1bd", marginTop: 20, display: "flex" }}>Apps, games, websites and experiments.</div>
        <div style={{ height: 4, width: 220, background: "#3d7bff", marginTop: 44, display: "flex" }} />
      </div>
    ),
    size,
  );
}
