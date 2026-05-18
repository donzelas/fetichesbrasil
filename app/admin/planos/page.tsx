import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { PlansManager, type PlanRecord } from "./PlansManager";

export const dynamic = "force-dynamic";

export default async function AdminPlansPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("plans" as never)
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  const plans = (data ?? []) as unknown as PlanRecord[];

  return (
    <div className="container max-w-5xl space-y-6 py-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Planos Premium</h1>
        <p className="text-muted-foreground">
          Crie planos de Pix (pagamento único). Cada plano define quantos dias de
          Premium o usuário ganha após o pagamento ser aprovado pelo Mercado Pago.
        </p>
      </div>

      <Card>
        <CardContent className="p-4 sm:p-6">
          <PlansManager initialPlans={plans} />
        </CardContent>
      </Card>
    </div>
  );
}
