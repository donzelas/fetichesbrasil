"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SignupPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accepted) {
      toast.error("Você precisa aceitar os termos.");
      return;
    }
    setLoading(true);

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, username }),
    });
    const payload = (await res.json().catch(() => ({}))) as {
      error?: string;
    };

    if (!res.ok) {
      setLoading(false);
      toast.error("Falha ao criar conta", {
        description: payload.error ?? "Tente novamente.",
      });
      return;
    }

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (signInError) {
      toast.success("Conta criada!", {
        description: "Faça login para continuar.",
      });
      router.push("/login");
      return;
    }

    toast.success("Conta criada!", { description: "Bem-vindo(a)." });
    router.push("/");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Criar conta</CardTitle>
        <CardDescription>Cadastro gratuito e rápido. 18+ apenas.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Nome de usuário</Label>
            <Input
              id="username"
              required
              minLength={3}
              maxLength={24}
              pattern="[a-zA-Z0-9_]+"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="seunick"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              required
              autoComplete="new-password"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Mínimo 6 caracteres.</p>
          </div>

          <label className="flex items-start gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              required
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="mt-1"
            />
            Confirmo que tenho 18 anos ou mais e aceito os Termos de Uso e a Política de
            Privacidade.
          </label>

          <Button type="submit" className="w-full" size="lg" variant="gradient" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Criar conta
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Já tem conta?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Entrar
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
