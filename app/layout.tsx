import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { AgeGate } from "@/components/layout/AgeGate";
import { AutoLogout } from "@/components/auth/AutoLogout";
import { Toaster } from "@/components/ui/sonner";
import { OrganizationJsonLd, WebsiteJsonLd } from "@/components/seo/JsonLd";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fetichesbrasil.com.br";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Fetiches Brasil — Comunidade adulta consensual brasileira",
    template: "%s • Fetiches Brasil",
  },
  description:
    "Comunidade brasileira de adultos consensuais com 94 preferências catalogadas em 9 categorias. Chat em tempo real, salas temáticas e blog educativo. Exclusivo +18.",
  keywords: [
    "comunidade adulta brasileira",
    "fetiches brasil",
    "lifestyle BDSM Brasil",
    "chat adulto consensual",
    "salas tematicas adultas",
    "kinks brasileiros",
    "comunidade +18 BR",
  ],
  authors: [{ name: "Fetiches Brasil", url: SITE_URL }],
  creator: "Fetiches Brasil",
  publisher: "Fetiches Brasil",
  category: "Lifestyle",
  // Conteudo adulto - SafeSearch obrigatorio
  other: {
    rating: "adult",
    "RATING": "RTA-5042-1996-1400-1577-RTA",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  alternates: {
    canonical: "/",
    languages: { "pt-BR": "/" },
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: SITE_URL,
    siteName: "Fetiches Brasil",
    title: "Fetiches Brasil — Comunidade adulta consensual brasileira",
    description:
      "94 preferências em 9 categorias. Chat em tempo real, salas temáticas, blog educativo. Comunidade brasileira +18.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Fetiches Brasil",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Fetiches Brasil",
    description: "Comunidade brasileira de adultos consensuais. +18.",
    images: ["/og-image.png"],
  },
  appLinks: {
    web: { url: SITE_URL, should_fallback: true },
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0c",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <head>
        <OrganizationJsonLd />
        <WebsiteJsonLd />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <AgeGate />
        <AutoLogout />
        <div className="flex min-h-screen flex-col">
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
