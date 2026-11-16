import { ImageResponse } from "next/og";

export const alt = "Ghost Hub: games, apps and websites in one place";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 90, background: "radial-gradient(circle at 15% 0%, #3b3394 0%, transparent 55%), radial-gradient(circle at 95% 10%, #0e5f86 0%, transparent 50%), #0b0c10", color: "#eef0f6" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <svg width="120" height="120" viewBox="0 0 24 24">
            <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#a99cff" /><stop offset="0.55" stopColor="#5cc8ff" /><stop offset="1" stopColor="#5eead4" /></linearGradient></defs>
            <path fill="url(#g)" d="M12 2.5c-4.4 0-7.5 3.3-7.5 7.7v10.3c0 .6.7.9 1.1.5l1.6-1.5c.3-.3.8-.3 1.1 0l1.6 1.5c.3.3.8.3 1.1 0L12 19.7l1.4 1.3c.3.3.8.3 1.1 0l1.6-1.5c.3-.3.8-.3 1.1 0l1.6 1.5c.4.4 1.1.1 1.1-.5V10.2c0-4.4-3.1-7.7-7.5-7.7z" />
            <circle cx="9.3" cy="10.4" r="1.35" fill="#0b0c10" /><circle cx="14.7" cy="10.4" r="1.35" fill="#0b0c10" />
          </svg>
          <div style={{ fontSize: 128, fontWeight: 800, display: "flex", letterSpacing: -3 }}>Ghost Hub</div>
        </div>
        <div style={{ fontSize: 40, color: "#aab0c0", marginTop: 34, display: "flex" }}>Games, apps and websites, all in one place.</div>
      </div>
    ),
    size,
  );
}
