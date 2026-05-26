import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fetiches Brasil",
    short_name: "Fetiches BR",
    description:
      "Comunidade brasileira de adultos consensuais. Chat em tempo real, salas temáticas. +18.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0a0c",
    theme_color: "#0a0a0c",
    icons: [
      {
        src: "/logo.png",
        sizes: "any",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/logo.png",
        sizes: "any",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    categories: ["social", "lifestyle"],
    lang: "pt-BR",
    shortcuts: [
      {
        name: "Admin Mobile",
        short_name: "Admin",
        description: "Painel admin otimizado pra celular",
        url: "/admin/mobile",
        icons: [{ src: "/logo.png", sizes: "any" }],
      },
      {
        name: "Chat",
        short_name: "Chat",
        description: "Salas de bate-papo",
        url: "/chat",
        icons: [{ src: "/logo.png", sizes: "any" }],
      },
    ],
  };
}
