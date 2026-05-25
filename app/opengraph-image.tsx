import { ImageResponse } from "next/og";

/**
 * Open Graph image padrao do site.
 * Renderizada como /opengraph-image quando alguem compartilha
 * a URL raiz no Twitter, Facebook, WhatsApp, Telegram, etc.
 *
 * Paginas individuais podem ter sua propria opengraph-image.tsx.
 */
export const runtime = "edge";
export const alt = "Fetiches Brasil — Comunidade adulta consensual brasileira";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0a0a0c",
          backgroundImage:
            "radial-gradient(circle at 25% 25%, rgba(225, 29, 72, 0.18), transparent 50%), radial-gradient(circle at 75% 75%, rgba(190, 24, 93, 0.16), transparent 50%)",
          padding: "80px",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "20px",
            marginBottom: "32px",
          }}
        >
          <div
            style={{
              fontSize: "64px",
              fontWeight: 800,
              color: "white",
              letterSpacing: "-0.02em",
            }}
          >
            Fetiches Brasil
          </div>
        </div>

        <div
          style={{
            fontSize: "36px",
            color: "rgba(255, 255, 255, 0.85)",
            textAlign: "center",
            lineHeight: 1.3,
            maxWidth: "900px",
          }}
        >
          Comunidade brasileira de adultos consensuais
        </div>

        <div
          style={{
            display: "flex",
            gap: "32px",
            marginTop: "48px",
            fontSize: "22px",
            color: "rgba(255, 255, 255, 0.7)",
          }}
        >
          <div>94 preferências</div>
          <div>•</div>
          <div>9 categorias</div>
          <div>•</div>
          <div>Chat em tempo real</div>
        </div>

        <div
          style={{
            position: "absolute",
            bottom: "40px",
            right: "60px",
            padding: "8px 20px",
            backgroundColor: "#e11d48",
            color: "white",
            fontWeight: 700,
            fontSize: "24px",
            borderRadius: "999px",
          }}
        >
          +18
        </div>
      </div>
    ),
    { ...size }
  );
}
