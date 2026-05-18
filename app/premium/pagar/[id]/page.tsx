import { redirect } from "next/navigation";
import { PixPaymentClient } from "./PixPaymentClient";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Pagamento via PIX",
};

export default async function PixPaymentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/premium/pagar/${id}`);

  return <PixPaymentClient paymentId={id} />;
}
