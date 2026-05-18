"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/useUser";
import { createClient } from "@/lib/supabase/client";
import { PrivacyPolicyTrigger, TermsOfUseTrigger } from "@/components/legal/LegalDialogs";

export function Footer() {
  const { user, isAdmin, isPremium, loading } = useUser();
  const router = useRouter();

  if (isAdmin) return null;

  const isAuthenticated = !!user;

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const linkCls = "hover:text-foreground transition-colors";

  return (
    <footer className="mt-12 border-t border-border/50 bg-card/40">
      <div className="container py-4">
        <div className="flex flex-col items-center gap-3 text-center md:flex-row md:justify-between md:text-left">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold">
            <Image
              src="/logo.png"
              alt="Fetiches Brasil"
              width={28}
              height={28}
              className="h-7 w-7 object-contain"
            />
            Fetiches Brasil
          </Link>

          <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <Link href="/" className={linkCls}>Home</Link>
            <Link href="/chat" className={linkCls}>Chat</Link>
            <Link href="/blog" className={linkCls}>Blog</Link>
            {isPremium ? (
              <Link href="/salas/nova" className={linkCls}>Criar sala</Link>
            ) : (
              <Link href="/premium" className={linkCls}>Premium</Link>
            )}

            <span className="text-border">·</span>

            {!loading && (isAuthenticated ? (
              <>
                <Link href="/perfil" className={linkCls}>Perfil</Link>
                <button type="button" onClick={handleLogout} className={linkCls}>
                  Sair
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className={linkCls}>Entrar</Link>
                <Link href="/signup" className={linkCls}>Criar conta</Link>
              </>
            ))}

            <span className="text-border">·</span>

            <PrivacyPolicyTrigger className={linkCls}>Privacidade</PrivacyPolicyTrigger>
            <TermsOfUseTrigger className={linkCls}>Termos</TermsOfUseTrigger>
            <span>+18</span>
          </nav>

          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Fetiches Brasil
          </p>
        </div>
      </div>
    </footer>
  );
}
