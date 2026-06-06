import os
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests as http_requests
from supabase import create_client

from recomendador import recomendar_lugares

# ─────────────────────────────
# ENV
# ─────────────────────────────

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR.parent / ".env")

SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SECRET_KEY")
N8N_WEBHOOK_URL = os.getenv("N8N_WEBHOOK_URL")
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
BACKEND_URL = (os.getenv("VITE_API_URL") or "").rstrip("/")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("Faltan variables SUPABASE_URL y SUPABASE_SECRET_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# ─────────────────────────────
# APP
# ─────────────────────────────

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def register_telegram_webhook():
    if not TELEGRAM_BOT_TOKEN:
        print("[Telegram] TELEGRAM_BOT_TOKEN no configurado — webhook no registrado")
        return
    if not BACKEND_URL:
        print("[Telegram] VITE_API_URL no configurado — no se puede registrar webhook")
        return
    webhook_url = f"{BACKEND_URL}/telegram-webhook"
    try:
        resp = http_requests.post(
            f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/setWebhook",
            json={"url": webhook_url},
            timeout=10,
        )
        data = resp.json()
        if data.get("ok"):
            print(f"[Telegram] Webhook registrado en: {webhook_url}")
        else:
            print(f"[Telegram] Error al registrar webhook: {data}")
    except Exception as exc:
        print(f"[Telegram] Excepción al registrar webhook: {exc}")

# ─────────────────────────────
# MODELOS
# ─────────────────────────────

class RecomendacionRequest(BaseModel):
    group_id: str

class EnviarTelegramRequest(BaseModel):
    group_id: str

class RegistrarTelegramRequest(BaseModel):
    chat_id: str
    group_id: str
    username: str = ""
    first_name: str = ""
    last_name: str = ""

# ─────────────────────────────
# 1. RECOMENDAR (WEB SOLO RESUMEN)
# ─────────────────────────────

@app.post("/recomendar")
def recomendar(req: RecomendacionRequest):

    details = supabase.table("group_details") \
        .select("*") \
        .eq("group_id", req.group_id) \
        .execute()

    if not details.data:
        raise HTTPException(404, "Grupo no encontrado")

    data = details.data[0]

    result = recomendar_lugares(
        data.get("members", []),
        data.get("quiz_answers", {})
    )

    supabase.table("group_recommendations").insert({
        "group_id": req.group_id,
        "score": result["score"],
        "insights": result["insights"],
        "top_lugares": result.get("top_lugares", []),
        "explicacion": result.get("explicacion", "")
    }).execute()

    return {
        "score": result["score"],
        "insights": (result.get("insights") or [])[:3]
    }

# ─────────────────────────────
# 2. ENVIAR A TELEGRAM
# ─────────────────────────────

@app.post("/enviar-telegram")
def enviar_telegram(req: EnviarTelegramRequest):

    rec = supabase.table("group_recommendations") \
        .select("*") \
        .eq("group_id", req.group_id) \
        .order("created_at", desc=True) \
        .limit(1) \
        .execute()

    if not rec.data:
        raise HTTPException(404, "No hay recomendación")

    result = rec.data[0]

    print(f"[Telegram] Group ID recibido: {req.group_id}")

    users = supabase.table("telegram_users") \
        .select("*") \
        .eq("group_id", req.group_id) \
        .execute()

    print(f"[Telegram] Usuarios encontrados: {len(users.data)}")

    if not users.data:
        raise HTTPException(
            404,
            "Ningún integrante del parche ha vinculado Telegram todavía"
        )

    chat_ids = [u["chat_id"] for u in users.data]
    print(f"[Telegram] Chat IDs encontrados: {chat_ids}")

    message = build_message(result, req.group_id)

    enviados = 0
    errores = 0

    for user in users.data:
        chat_id = user["chat_id"]
        try:
            send_to_telegram(chat_id, message, req.group_id)
            print(f"[Telegram] Mensaje enviado correctamente a chat_id={chat_id}")
            enviados += 1
        except Exception as exc:
            print(f"[Telegram] Error al enviar a chat_id={chat_id}: {exc}")
            errores += 1

    if enviados > 0:
        supabase.table("group_recommendations") \
            .update({"telegram_sent": True}) \
            .eq("id", result["id"]) \
            .execute()

    return {
        "ok": enviados > 0,
        "usuarios_encontrados": len(users.data),
        "mensajes_enviados": enviados,
        "errores": errores,
    }

# ─────────────────────────────
# 3. TELEGRAM WEBHOOK
# ─────────────────────────────

@app.post("/telegram-webhook")
def telegram_webhook(update: dict):

    msg = update.get("message", {})
    chat = msg.get("chat", {})
    text = msg.get("text", "") or ""

    chat_id = chat.get("id")
    username = chat.get("username") or ""
    first_name = chat.get("first_name") or ""
    last_name = chat.get("last_name") or ""

    parts = text.strip().split(maxsplit=1)
    group_id = parts[1].strip() if len(parts) > 1 and parts[0] == "/start" else None

    print(f"[Webhook] chat_id={chat_id} text={repr(text)} group_id={group_id}")

    if chat_id and group_id:
        _upsert_telegram_user(str(chat_id), group_id, username, first_name, last_name)
    else:
        print(f"[Webhook] Sin group_id para chat_id={chat_id} — ignorado")

    return {"ok": True}


@app.post("/registrar-telegram")
def registrar_telegram(req: RegistrarTelegramRequest):
    """
    Endpoint alternativo para que n8n registre usuarios cuando recibe /start GROUP_ID.
    Configurar en n8n: POST https://cali-match.onrender.com/registrar-telegram
    Body: { chat_id, group_id, username, first_name, last_name }
    """
    if not req.chat_id or not req.group_id:
        raise HTTPException(400, "chat_id y group_id son requeridos")

    _upsert_telegram_user(req.chat_id, req.group_id, req.username, req.first_name, req.last_name)
    return {"ok": True, "chat_id": req.chat_id, "group_id": req.group_id}


def _upsert_telegram_user(
    chat_id: str,
    group_id: str,
    username: str,
    first_name: str,
    last_name: str,
):
    try:
        result = supabase.table("telegram_users").upsert(
            {
                "chat_id": chat_id,
                "username": username,
                "first_name": first_name,
                "last_name": last_name,
                "group_id": group_id,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            },
            on_conflict="chat_id"
        ).execute()

        print("[Telegram] Usuario registrado")
        print(result.data)

        return result

    except Exception as e:
        print("[Telegram] ERROR REGISTRANDO USUARIO")
        print(str(e))
        raise


@app.get("/debug-telegram/{group_id}")
def debug_telegram(group_id: str):
    all_users = supabase.table("telegram_users").select("chat_id,username,group_id,updated_at").execute()
    group_users = [u for u in all_users.data if u.get("group_id") == group_id]
    return {
        "group_id_buscado": group_id,
        "total_usuarios_en_tabla": len(all_users.data),
        "usuarios_en_este_grupo": len(group_users),
        "detalle": group_users,
        "todos_los_group_ids": list({u.get("group_id") for u in all_users.data}),
    }

# ─────────────────────────────
# 4. MENSAJE TELEGRAM (COMPLETO)
# ─────────────────────────────

def build_message(result, group_id):

    insights_text = "\n".join(
        f"✨ {i}" for i in (result.get("insights") or [])
    )

    lugares = result.get("top_lugares") or []

    lugares_text = ""
    if lugares:
        lines = []

        for idx, l in enumerate(lugares[:5], 1):
            nombre = l.get("nombre", "Lugar")
            barrio = l.get("barrio", "")
            categoria = l.get("categoria", "")
            desc = l.get("descripcion", "")
            pct = l.get("match_pct", "")

            lines.append(
                f"{idx}. {nombre} ({pct}% match)\n"
                f"   📍 {barrio} | {categoria}\n"
                f"   🧠 {desc}"
            )

        lugares_text = "\n\n🏆 Mejores lugares:\n\n" + "\n\n".join(lines)

    return f"""
🔥 CALIMATCH - RESULTADO DEL PARCHE {group_id}

📊 Score: {result.get('score', '—')}%

────────────────────

💡 Insights:
{insights_text}

{lugares_text}

🍹 ¡Disfruten el parche!
"""

# ─────────────────────────────
# 5. ENVÍO (N8N)
# ─────────────────────────────

def send_to_telegram(chat_id, message, group_id):

    payload = {
        "chat_id": chat_id,
        "message": message,
        "group_id": group_id
    }

    print(f"[Telegram] Payload n8n → chat_id={chat_id}: {payload}")

    resp = http_requests.post(N8N_WEBHOOK_URL, json=payload, timeout=10)
    resp.raise_for_status()