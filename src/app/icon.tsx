import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", background: "#0b0c10", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 14 }}>
        <svg width="44" height="44" viewBox="0 0 24 24">
          <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#a99cff" /><stop offset="0.55" stopColor="#5cc8ff" /><stop offset="1" stopColor="#5eead4" /></linearGradient></defs>
          <path fill="url(#g)" d="M12 2.5c-4.4 0-7.5 3.3-7.5 7.7v10.3c0 .6.7.9 1.1.5l1.6-1.5c.3-.3.8-.3 1.1 0l1.6 1.5c.3.3.8.3 1.1 0L12 19.7l1.4 1.3c.3.3.8.3 1.1 0l1.6-1.5c.3-.3.8-.3 1.1 0l1.6 1.5c.4.4 1.1.1 1.1-.5V10.2c0-4.4-3.1-7.7-7.5-7.7z" />
          <circle cx="9.3" cy="10.4" r="1.35" fill="#0b0c10" /><circle cx="14.7" cy="10.4" r="1.35" fill="#0b0c10" />
        </svg>
      </div>
    ),
    size,
  );
}
