import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const ROOM_IMAGE_BUCKET = "room-images";

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

  // Busca a mensagem para descobrir image_path (defensivo: se já não existe,
  // ainda assim limpa o storage caso o cliente envie o path no body).
  const { data: msg } = await admin
    .from("messages")
    .select("id, image_path, content")
    .eq("id", id)
    .single();

  if (!msg) {
    return NextResponse.json(
      { error: "Mensagem não encontrada" },
      { status: 404 }
    );
  }

  if (msg.image_path) {
    const { error: rmErr } = await admin.storage
      .from(ROOM_IMAGE_BUCKET)
      .remove([msg.image_path]);
    if (rmErr) {
      console.warn(
        "[admin/room-images/delete] falha ao remover do storage:",
        rmErr
      );
    }
  }

  // Se a mensagem tinha conteúdo de texto além da imagem, preserva a mensagem
  // apenas zerando a referência da imagem; caso contrário, apaga a mensagem.
  if (msg.content && msg.content.trim().length > 0) {
    const { error } = await admin
      .from("messages")
      .update({ image_path: null, expires_at: null })
      .eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, kept: "content" });
  }

  const { error } = await admin.from("messages").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
