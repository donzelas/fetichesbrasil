import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LEGAL_LAST_UPDATED, PrivacyPolicyBody } from "@/components/legal/LegalContent";

export const metadata: Metadata = {
  title: "Política de Privacidade — Fetiches Brasil",
  description:
    "Como o Fetiches Brasil coleta, usa, armazena e protege os dados pessoais dos seus usuários. Em conformidade com a LGPD.",
  robots: { index: true, follow: true },
};

export default function PrivacyPolicyPage() {
  return (
    <div className="container max-w-3xl py-8">
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link href="/">
          <ArrowLeft className="h-4 w-4" />
          Voltar para home
        </Link>
      </Button>

      <header className="mb-8 space-y-2 border-b border-border/40 pb-6">
        <h1 className="text-3xl font-bold tracking-tight">Política de Privacidade</h1>
        <p className="text-sm text-muted-foreground">
          Última atualização: <strong>{LEGAL_LAST_UPDATED}</strong>. Plataforma destinada
          exclusivamente a maiores de 18 anos.
        </p>
      </header>

      <PrivacyPolicyBody />

      <footer className="mt-10 border-t border-border/40 pt-6 text-xs text-muted-foreground">
        Para dúvidas sobre seus dados, entre em contato pelo e-mail{" "}
        <a href="mailto:contato@fetichesbrasil.com.br" className="underline">
          contato@fetichesbrasil.com.br
        </a>
        . Veja também os{" "}
        <Link href="/termos" className="underline">
          Termos de Uso
        </Link>
        .
      </footer>
    </div>
  );
}
