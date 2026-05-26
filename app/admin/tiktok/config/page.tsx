import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { TiktokSettingsForm } from "@/components/admin/TiktokSettingsForm";
import type { TiktokSettings } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function TiktokSettingsPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("tiktok_settings").select("*").single();
  const settings = data as TiktokSettings;

  return (
    <div className="container max-w-3xl space-y-6 py-6">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/tiktok">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
        </Button>
      </div>

      <header>
        <h1 className="text-2xl font-bold tracking-tight">Configurações TikTok IA</h1>
        <p className="text-sm text-muted-foreground">
          Defaults globais para legendas, voz, vídeo e cron. Aplicado em todos os roteiros futuros.
        </p>
      </header>

      <TiktokSettingsForm initial={settings} />
    </div>
  );
}
