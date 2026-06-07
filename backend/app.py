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
# STARTUP
# ─────────────────────────────

@app.on_event("startup")
def register_telegram_webhook():
    if not TELEGRAM_BOT_TOKEN or not BACKEND_URL:
        return

    webhook_url = f"{BACKEND_URL}/telegram-webhook"

    try:
        resp = http_requests.post(
            f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/setWebhook",
            json={"url": webhook_url},
            timeout=10,
        )
        print("[Telegram webhook]", resp.json())
    except Exception as e:
        print("[Webhook error]", str(e))

# ─────────────────────────────
# 1. RECOMENDAR
# ─────────────────────────────

@app.post("/recomendar")
def recomendar(req: RecomendacionRequest):
    group_id = normalize_group_id(req.group_id)

    details = supabase.table("group_details") \
        .select("*") \
        .eq("group_id", group_id) \
        .execute()

    if not details.data:
        raise HTTPException(404, "Grupo no encontrado")

    data = details.data[0]

    result = recomendar_lugares(
        data.get("members", []),
        data.get("quiz_answers", {})
    )

    supabase.table("group_recommendations").upsert(
    {
        "group_id": group_id,
        "score": result["score"],
        "insights": result["insights"],
        "top_lugares": result.get("top_lugares", []),
        "explicacion": result.get("explicacion", "")
    },
    on_conflict="group_id"
    ).execute()

    return {
        "score": result["score"],
        "insights": (result.get("insights") or [])[:3],
        "top_lugares": result.get("top_lugares", []),
        "explicacion": result.get("explicacion", ""),
        "persona_prototipica": result.get("persona_prototipica", {}),
    }

# ─────────────────────────────
# 2. ENVIAR TELEGRAM
# ─────────────────────────────

@app.post("/enviar-telegram")
def enviar_telegram(req: EnviarTelegramRequest):
    group_id = normalize_group_id(req.group_id)
    print("==========")
    print("GROUP:", group_id)

    rec = supabase.table("group_recommendations") \
        .select("*") \
        .eq("group_id", group_id) \
        .order("created_at", desc=True) \
        .limit(1) \
        .execute()
    print("RECOMMENDATIONS:", rec.data)

    # Si no hay recomendación guardada, generarla ahora
    if not rec.data:
        details = supabase.table("group_details") \
            .select("*") \
            .eq("group_id", group_id) \
            .execute()
        if not details.data:
            raise HTTPException(404, "Grupo no encontrado")
        data = details.data[0]
        gen = recomendar_lugares(
            data.get("members", []),
            data.get("quiz_answers", {})
        )
        supabase.table("group_recommendations").insert({
            "group_id": group_id,
            "score": gen["score"],
            "insights": gen["insights"],
            "top_lugares": gen.get("top_lugares", []),
            "explicacion": gen.get("explicacion", "")
        }).execute()
        result = {
            "group_id": group_id,
            "score": gen["score"],
            "insights": gen["insights"],
            "top_lugares": gen.get("top_lugares", []),
            "explicacion": gen.get("explicacion", "")
        }
    else:
        result = rec.data[0]

    users = supabase.table("telegram_user_groups") \
        .select("*") \
        .eq("group_id", group_id) \
        .execute()
    print("USERS:", users.data)

    if not users.data:
        raise HTTPException(404, "No hay usuarios vinculados en este grupo")

    message = build_message(result, group_id)

    enviados = 0
    errores = 0

    for user in users.data:
        try:
            send_to_telegram(user["chat_id"], message, group_id)
            enviados += 1
        except Exception as e:
            print("[SEND ERROR]", e)
            errores += 1

    return {
        "ok": enviados > 0,
        "enviados": enviados,
        "errores": errores
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
    group_id = normalize_group_id(parts[1]) if len(parts) > 1 and parts[0] == "/start" else None

    if chat_id and group_id:
        save_telegram_user_group(
            str(chat_id),
            group_id,
            username,
            first_name,
            last_name
        )
        http_requests.post(
                f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                json={
                    "chat_id": chat_id,
                    "text": f"""✅ Tu cuenta quedó vinculada correctamente al grupo {group_id}.

        Ya podrás recibir recomendaciones de CaliMatch."""
                }
            )

    return {"ok": True}

# ─────────────────────────────
# 4. REGISTRO N8N
# ─────────────────────────────

@app.post("/registrar-telegram")
def registrar_telegram(req: RegistrarTelegramRequest):

    if not req.chat_id or not req.group_id:
        raise HTTPException(400, "chat_id y group_id son requeridos")

    save_telegram_user_group(
        req.chat_id,
        normalize_group_id(req.group_id),
        req.username,
        req.first_name,
        req.last_name
    )

    return {
        "ok": True,
        "chat_id": req.chat_id,
        "group_id": req.group_id
    }

# ─────────────────────────────
# 5. SAVE MULTI-GROUP (CLAVE)
# ─────────────────────────────

def save_telegram_user_group(chat_id, group_id, username, first_name, last_name):

    try:
        result = supabase.table("telegram_user_groups").upsert(
            {
                "chat_id": chat_id,
                "group_id": group_id,
                "username": username,
                "first_name": first_name,
                "last_name": last_name,
                "created_at": datetime.now(timezone.utc).isoformat()
            },
            on_conflict="chat_id,group_id"
        ).execute()

        print("[SAVE OK]", result.data)
        return result

    except Exception as e:
        print("[SAVE ERROR]", str(e))
        raise

# ─────────────────────────────
# 6. DEBUG
# ─────────────────────────────

@app.get("/debug-telegram/{group_id}")
def debug(group_id: str):

    data = supabase.table("telegram_user_groups") \
        .select("*") \
        .eq("group_id", group_id) \
        .execute()

    return {
        "count": len(data.data),
        "data": data.data
    }

# ─────────────────────────────
# 7. MESSAGE BUILDER
# ─────────────────────────────

def build_message(result, group_id):

    score = result.get("score", "—")
    insights = result.get("insights") or []
    lugares = result.get("top_lugares") or []

    insights_text = "\n".join(
        f"✨ {item}" for item in insights[:3]
    )

    lugares_lines = []

    for idx, lugar in enumerate(lugares[:4], start=1):
        lugares_lines.append(
            f"""{idx}. {lugar.get("nombre")} ({lugar.get("match_pct")}% match)
   📍 {lugar.get("barrio")} | {lugar.get("categoria")}
   🧠 {lugar.get("descripcion")}"""
        )

    lugares_text = "\n\n".join(lugares_lines)

    return f"""🔥 CALIMATCH - RESULTADO DEL PARCHE {group_id}

📊 Score: {score}%

────────────────────

💡 Insights:
{insights_text}


🏆 Mejores lugares:

{lugares_text}

🍹 ¡Disfruten el parche!. ✨ Ya pueden coordinar la salida y escoger el lugar que más les guste.
"""
# ─────────────────────────────
# 8. SEND TELEGRAM VIA N8N
# ─────────────────────────────

def send_to_telegram(chat_id, message, group_id):
    print("ENVIANDO A N8N")
    print("CHAT:", chat_id)
    print("GROUP:", group_id)

    payload = {
        "chat_id": chat_id,
        "message": message,
        "group_id": group_id
    }

    resp = http_requests.post(N8N_WEBHOOK_URL, json=payload, timeout=10)
    print("N8N STATUS:", resp.status_code)
    print("N8N RESPONSE:", resp.text)
    resp.raise_for_status()

def normalize_group_id(group_id: str):
    return group_id.strip().upper()

@app.get("/test")
def test():
    return {"ok": True}

@app.get("/debug-env")
def debug_env():
    return {
        "n8n": bool(N8N_WEBHOOK_URL),
        "telegram": bool(TELEGRAM_BOT_TOKEN),
        "backend": BACKEND_URL
    }