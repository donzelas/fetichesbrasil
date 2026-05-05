import Link from "next/link";
import { Sparkles } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-border/50 bg-card/40">
      <div className="container py-10">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <Link href="/" className="flex items-center gap-2 font-bold">
              <Sparkles className="h-5 w-5 text-primary" />
              Fetiches Brasil
            </Link>
            <p className="mt-3 text-sm text-muted-foreground">
              Conexões consensuais entre adultos. Privado, seguro e sem julgamentos.
            </p>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold">Navegação</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/" className="hover:text-foreground">Home</Link></li>
              <li><Link href="/salas" className="hover:text-foreground">Salas</Link></li>
              <li><Link href="/premium" className="hover:text-foreground">Premium</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold">Conta</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/login" className="hover:text-foreground">Entrar</Link></li>
              <li><Link href="/signup" className="hover:text-foreground">Criar conta</Link></li>
              <li><Link href="/reset-password" className="hover:text-foreground">Esqueci a senha</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Apenas para maiores de 18 anos</li>
              <li>Conteúdo entre adultos consensuais</li>
              <li>Política de privacidade</li>
              <li>Termos de uso</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-border/50 pt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Fetiches Brasil. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
}
