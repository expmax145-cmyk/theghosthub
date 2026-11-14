import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", background: "#040407", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, borderRadius: 12 }}>
        <div style={{ width: 20, height: 10, background: "#ff1219", borderRadius: 6 }} />
        <div style={{ width: 20, height: 10, background: "#ff1219", borderRadius: 6 }} />
      </div>
    ),
    size,
  );
}
