import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const DM_IMAGE_BUCKET = "dm-images";

async function ensureAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado", status: 401 as const };
  const { data: me } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!me?.is_admin) return { error: "Sem permissão", status: 403 as const };
  return { user };
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await ensureAdmin();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
  }

  const admin = createAdminClient();

  // 1) Lista e apaga imagens do storage no diretorio do thread
  //    O padrao de path eh `${thread_id}/${user_id}/${filename}`, entao
  //    listamos recursivamente o prefixo `${thread_id}/`.
  try {
    // O list do supabase storage nao eh recursivo por padrao. Buscamos
    // diretamente por mensagens com image_path desse thread.
    const { data: messagesWithImage } = await admin
      .from("dm_messages")
      .select("image_path")
      .eq("thread_id", id)
      .not("image_path", "is", null);

    const paths = (messagesWithImage ?? [])
      .map((m: { image_path: string | null }) => m.image_path)
      .filter((p): p is string => !!p);

    if (paths.length > 0) {
      const { error: rmErr } = await admin.storage
        .from(DM_IMAGE_BUCKET)
        .remove(paths);
      if (rmErr) {
        console.warn("[admin/dm-threads/delete] falha ao remover imagens:", rmErr);
        // nao bloqueia — segue pra deletar o thread mesmo assim
      }
    }
  } catch (e) {
    console.warn("[admin/dm-threads/delete] erro listando imagens:", e);
  }

  // 2) Apaga o thread — dm_messages e dm_thread_participants
  //    cascateiam pela FK ON DELETE CASCADE.
  const { error } = await admin.from("dm_threads").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
