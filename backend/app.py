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

# ─────────────────────────────
# MODELOS
# ─────────────────────────────

class RecomendacionRequest(BaseModel):
    group_id: str

class EnviarTelegramRequest(BaseModel):
    group_id: str

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

    user = supabase.table("telegram_users") \
        .select("*") \
        .eq("group_id", req.group_id) \
        .limit(1) \
        .execute()

    if not user.data:
        raise HTTPException(404, "Usuario no vinculado a Telegram")

    chat_id = user.data[0]["chat_id"]

    message = build_message(result, req.group_id)

    send_to_telegram(chat_id, message, req.group_id)

    supabase.table("group_recommendations") \
        .update({"telegram_sent": True}) \
        .eq("id", result["id"]) \
        .execute()

    return {"ok": True}

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
    group_id = parts[1] if len(parts) > 1 and parts[0] == "/start" else None

    if chat_id:
        supabase.table("telegram_users").upsert(
            {
                "chat_id": str(chat_id),
                "username": username,
                "first_name": first_name,
                "last_name": last_name,
                "group_id": group_id,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            },
            on_conflict="chat_id"
        ).execute()

    return {"ok": True}

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
    http_requests.post(
        N8N_WEBHOOK_URL,
        json={
            "chat_id": chat_id,
            "message": message,
            "group_id": group_id
        }
    )