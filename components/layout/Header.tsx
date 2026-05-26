"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, Crown, LogOut, Plus, Shield, User as UserIcon } from "lucide-react";
import { useUser } from "@/hooks/useUser";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** Calcula quantos dias inteiros faltam para o Premium expirar.
 *  Retorna null se nao tiver data ou se ja expirou. */
function daysUntilPremiumExpires(expiresAt: string | null | undefined): number | null {
  if (!expiresAt) return null;
  const end = new Date(expiresAt).getTime();
  const now = Date.now();
  if (end <= now) return 0;
  return Math.ceil((end - now) / (1000 * 60 * 60 * 24));
}

export function Header() {
  const { user, profile, isPremium, isAdmin, loading } = useUser();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    // Limpa cookie de admin persistente (se houver)
    if (isAdmin) {
      try {
        await fetch("/api/auth/admin-session", { method: "DELETE" });
      } catch {
        // Ignora - logout do supabase eh o importante
      }
    }
    await supabase.auth.signOut();
    router.push(isAdmin ? "/login" : "/");
    router.refresh();
  }

  const logoHref = isAdmin ? "/admin" : "/";

  // premium_expires_at nao esta nos types gerados (foi adicionado em 0016).
  const premiumExpiresAt = (profile as { premium_expires_at?: string | null } | null)
    ?.premium_expires_at ?? null;
  const daysLeft = isPremium ? daysUntilPremiumExpires(premiumExpiresAt) : null;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/50 glass">
      <div className="container flex h-16 items-center justify-between">
        <Link href={logoHref} className="flex items-center gap-2 font-bold">
          <Image
            src="/logo.png"
            alt="Fetiches Brasil"
            width={40}
            height={40}
            priority
            className="h-10 w-10 object-contain"
          />
          <span className="text-lg tracking-tight">
            Fetiches <span className="text-primary">Brasil</span>
            {isAdmin && (
              <span className="ml-2 inline-flex items-center gap-1 text-xs font-normal text-muted-foreground">
                <Shield className="h-3 w-3" />
                Admin
              </span>
            )}
          </span>
        </Link>

        {isAdmin ? (
          <nav className="hidden items-center gap-6 md:flex">
            <Link
              href="/admin"
              className="text-sm text-muted-foreground hover:text-foreground transition"
            >
              Painel
            </Link>
            <Link
              href="/admin/salas"
              className="text-sm text-muted-foreground hover:text-foreground transition"
            >
              Salas
            </Link>
            <Link
              href="/admin/destaques"
              className="text-sm text-muted-foreground hover:text-foreground transition"
            >
              Destaques
            </Link>
            <Link
              href="/admin/posts"
              className="text-sm text-muted-foreground hover:text-foreground transition"
            >
              Blog
            </Link>
            <Link
              href="/admin/mensagens"
              className="text-sm text-muted-foreground hover:text-foreground transition"
            >
              Chats
            </Link>
            <Link
              href="/admin/usuarios"
              className="text-sm text-muted-foreground hover:text-foreground transition"
            >
              Usuários
            </Link>
            <Link
              href="/admin/planos"
              className="text-sm text-muted-foreground hover:text-foreground transition"
            >
              Planos
            </Link>
          </nav>
        ) : (
          <nav className="hidden items-center gap-6 md:flex">
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition">
              Home
            </Link>
            <Link href="/chat" className="text-sm text-muted-foreground hover:text-foreground transition">
              Chat
            </Link>
            <Link href="/blog" className="text-sm text-muted-foreground hover:text-foreground transition">
              Blog
            </Link>
            <Link href="/premium" className="text-sm text-muted-foreground hover:text-foreground transition">
              Premium
            </Link>
          </nav>
        )}

        <div className="flex items-center gap-2">
          {loading ? (
            <div className="h-9 w-20 animate-pulse rounded-md bg-muted" />
          ) : user && isAdmin ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1.5">
                  <span className="max-w-[140px] truncate">
                    {profile?.display_name ?? profile?.username ?? "Admin"}
                  </span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="flex flex-col">
                  <span className="flex items-center gap-1">
                    <Shield className="h-3 w-3 text-primary" />
                    {profile?.display_name ?? profile?.username}
                  </span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {user.email}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/admin">
                    <Shield className="h-4 w-4" />
                    Painel
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : user ? (
            <>
              {isPremium && (
                <Badge variant="premium" className="hidden sm:inline-flex">
                  <Crown className="mr-1 h-3 w-3" />
                  Premium
                  {daysLeft !== null && (
                    <span className="ml-1.5 opacity-80">
                      · {daysLeft}d
                    </span>
                  )}
                </Badge>
              )}
              {isPremium && (
                <Button asChild size="sm" variant="outline" className="hidden sm:inline-flex">
                  <Link href="/salas/nova">
                    <Plus className="h-4 w-4" />
                    Criar sala
                  </Link>
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  {profile?.avatar_url ? (
                    <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={profile.avatar_url} />
                      </Avatar>
                    </Button>
                  ) : (
                    <Button variant="ghost" size="sm" className="gap-1.5">
                      <span className="max-w-[140px] truncate">
                        {profile?.display_name ?? profile?.username ?? "Conta"}
                      </span>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  )}
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="flex flex-col">
                    <span>{profile?.display_name ?? profile?.username}</span>
                    <span className="text-xs font-normal text-muted-foreground">{user.email}</span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/perfil">
                      <UserIcon className="h-4 w-4" />
                      Meu perfil
                    </Link>
                  </DropdownMenuItem>
                  {!isPremium && (
                    <DropdownMenuItem asChild>
                      <Link href="/premium" className="text-premium">
                        <Crown className="h-4 w-4" />
                        Virar Premium
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {isPremium && (
                    <>
                      <DropdownMenuItem disabled className="text-premium opacity-100 focus:bg-transparent">
                        <Crown className="h-4 w-4" />
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold">Premium ativo</span>
                          {daysLeft !== null && (
                            <span className="text-[11px] font-normal text-muted-foreground">
                              {daysLeft === 0
                                ? "Expira hoje"
                                : daysLeft === 1
                                ? "1 dia restante"
                                : `${daysLeft} dias restantes`}
                            </span>
                          )}
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/salas/nova">
                          <Plus className="h-4 w-4" />
                          Criar sala
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="h-4 w-4" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button asChild size="sm" variant="ghost">
                <Link href="/login">Entrar</Link>
              </Button>
              <Button asChild size="sm" variant="gradient">
                <Link href="/cadastro">Criar conta</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
