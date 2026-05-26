"""Helper para atualizar progresso visivel no painel /admin/tiktok."""
from utils.supabase_client import get_client


def set_progress(script_id: str, message: str, status: str | None = None) -> None:
    """Atualiza progress_message (e opcionalmente status) no banco.
    Chamado no inicio de cada step do pipeline."""
    sb = get_client()
    update: dict = {"progress_message": message}
    if status is not None:
        update["status"] = status
    sb.table("tiktok_scripts").update(update).eq("id", script_id).execute()


def start_pipeline(script_id: str) -> None:
    """Marca o inicio do pipeline (zera contador, status processing)."""
    sb = get_client()
    sb.table("tiktok_scripts").update(
        {
            "status": "processing",
            "progress_message": "Iniciando pipeline...",
            "progress_started_at": "now()",
        }
    ).eq("id", script_id).execute()


def finish_pipeline(script_id: str, status: str = "ready_to_post") -> None:
    """Marca fim do pipeline."""
    sb = get_client()
    sb.table("tiktok_scripts").update(
        {"status": status, "progress_message": None}
    ).eq("id", script_id).execute()
