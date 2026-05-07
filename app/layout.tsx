import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { AgeGate } from "@/components/layout/AgeGate";
import { AutoLogout } from "@/components/auth/AutoLogout";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: {
    default: "Fetiches Brasil — Conexões adultas consensuais",
    template: "%s • Fetiches Brasil",
  },
  description:
    "Plataforma brasileira de chat e salas para adultos consensuais. Premium: salas exclusivas, fotos e conexões privadas.",
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "Fetiches Brasil",
    description: "Conexões consensuais entre adultos.",
    type: "website",
    locale: "pt_BR",
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
