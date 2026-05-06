import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { FeaturedCardsManager } from "./FeaturedCardsManager";

export const dynamic = "force-dynamic";

export default async function AdminFeaturedCardsPage() {
  const supabase = await createClient();
  const { data: cards } = await supabase
    .from("featured_fetish_cards")
    .select("*")
    .order("sort_order", { ascending: true });

  return (
    <div className="container max-w-5xl space-y-6 py-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Cards de destaque</h1>
        <p className="text-muted-foreground">
          Gerencie os cards do carrossel da home. Os cards rotacionam automaticamente a cada 3 segundos.
        </p>
      </div>

      <Card>
        <CardContent className="p-4 sm:p-6">
          <FeaturedCardsManager initialCards={cards ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}
