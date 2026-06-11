# 🗺️ CaliMatch

> Plataforma de recomendación grupal de lugares en Cali, integrada con un agente conversacional en Telegram.

---

## 📋 Tabla de contenidos

- [Problemática](#problemática)
- [Descripción del proyecto](#descripción-del-proyecto)
- [Objetivo general](#objetivo-general)
- [Arquitectura del sistema](#arquitectura-del-sistema)
- [Tecnologías utilizadas](#tecnologías-utilizadas)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Instalación y configuración](#instalación-y-configuración)
- [Variables de entorno](#variables-de-entorno)
- [Equipo](#equipo)

---

## ❗ Problemática

En Cali existe una gran variedad de lugares turísticos, culturales, gastronómicos y de entretenimiento. Sin embargo, cuando un grupo de personas desea organizar una salida o un *parche*, suelen aparecer dificultades para tomar decisiones que satisfagan los gustos, presupuestos e intereses de todos los integrantes.

Actualmente, muchas personas dependen de recomendaciones informales en redes sociales, opiniones de amigos o búsquedas generales en internet, lo que puede generar desorganización, desacuerdos y pérdida de tiempo al momento de elegir un plan grupal.

Además, no existen muchas herramientas enfocadas en recomendaciones grupales personalizadas que integren factores como el ambiente deseado, el tipo de actividad, el presupuesto y las preferencias individuales de cada integrante del grupo.

Por esta razón, surge la necesidad de desarrollar una solución tecnológica que facilite la toma de decisiones colectivas mediante recomendaciones inteligentes y personalizadas de lugares en Cali.

---

## 💡 Descripción del proyecto

CaliMatch es una plataforma web integrada con un agente conversacional en Telegram que permite a grupos de personas encontrar planes y lugares en Cali según las preferencias colectivas de sus integrantes.

El sistema permite:
- Crear grupos y registrar participantes
- Recolectar gustos individuales mediante un quiz en la plataforma web
- Vincular usuarios al grupo a través de Telegram
- Analizar preferencias grupales usando un algoritmo de **Persona Prototípica + Similitud Coseno**
- Generar recomendaciones personalizadas de lugares en Cali
- Votar por el lugar favorito del grupo directamente desde Telegram
- Calificar la experiencia después del parche

---

## 🎯 Objetivo general

Desarrollar una plataforma web integrada con un agente conversacional en Telegram capaz de recomendar lugares y planes grupales en Cali mediante el análisis de preferencias colectivas e intereses individuales de los usuarios.

---

## 🏗️ Arquitectura del sistema

```
┌─────────────────┐         ┌─────────────────┐
│   Frontend Web  │────────▶│   FastAPI        │
│   (React/Vite)  │         │   Backend        │
└─────────────────┘         └────────┬────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    ▼                ▼                 ▼
             ┌──────────┐    ┌──────────────┐  ┌──────────────┐
             │ Supabase │    │ Telegram Bot │  │     n8n      │
             │  (DB)    │    │  (Webhook)   │  │  (Workflows) │
             └──────────┘    └──────────────┘  └──────────────┘
```

**Flujo principal:**
1. El grupo crea un parche en la plataforma web y cada integrante responde el quiz de preferencias
2. El organizador envía la recomendación — FastAPI llama a n8n que manda el mensaje a Telegram
3. Los integrantes vinculados reciben la recomendación con botones interactivos
4. Pueden votar, pedir nueva recomendación o calificar la experiencia directamente desde Telegram
5. n8n procesa los callbacks y actualiza Supabase en tiempo real

---

## 🛠️ Tecnologías utilizadas

| Capa | Tecnología |
|------|-----------|
| Frontend | React + Vite |
| Backend | FastAPI (Python) |
| Base de datos | Supabase (PostgreSQL) |
| Automatización | n8n |
| Bot | Telegram Bot API |
| Algoritmo | Similitud Coseno + Persona Prototípica |
| Deploy | Render (backend), Vercel (frontend) |

---

## 📁 Estructura del proyecto

```
calimatch/
├── frontend/               # Aplicación web React
│   ├── src/
│   └── ...
├── backend/
│   ├── app.py              # API principal con FastAPI
│   ├── recomendador.py     # Motor de recomendación grupal
│   ├── lugares.json        # Base de datos de lugares en Cali
│   └── requirements.txt
└── README.md
```

---

## ⚙️ Instalación y configuración

### Backend

```bash
# Clonar el repositorio
git clone https://github.com/tu-usuario/calimatch.git
cd calimatch/backend

# Crear entorno virtual
python -m venv .venv
source .venv/bin/activate  # En Windows: .venv\Scripts\activate

# Instalar dependencias
pip install -r requirements.txt

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus valores

# Correr el servidor
uvicorn app:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## 🔐 Variables de entorno

Crea un archivo `.env` en la carpeta `backend/` con las siguientes variables:

```env
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SECRET_KEY=tu-service-role-key
TELEGRAM_BOT_TOKEN=tu-bot-token
N8N_WEBHOOK_URL=https://tu-instancia.n8n.cloud/webhook/calimatch-recommendation
VITE_API_URL=https://tu-backend.onrender.com
```

---

## 👥 Equipo

Proyecto desarrollado para la materia **Interacción Sociotecnológica** — Universidad Icesi.

| Nombre |
|--------|
| Nikol |
| Yeliani |
| Majo |
| Silvana |
---
## 📊 Presentación
[Ver diapositivas](https://canva.link/95g8zevt4q85zu2)
---

## 🤖 Workflows n8n
Los workflows de automatización están en la carpeta `/n8n`:
- `workflow1-enviar-recomendacion.json` — Envía la recomendación por Telegram
- `workflow2-procesar-callbacks.json` — Procesa las interacciones de los botones

---

> *CaliMatch — Porque el mejor parche es el que le gusta a todos* 🍹
