import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", background: "#0e1116", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 12, color: "#3d7bff", fontSize: 38, fontWeight: 800 }}>
        G
      </div>
    ),
    size,
  );
}
