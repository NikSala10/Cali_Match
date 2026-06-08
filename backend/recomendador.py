"""
Motor de recomendación grupal — CaliMatch
==========================================
Enfoque: Persona Prototípica + Similitud Coseno

El algoritmo construye un vector de preferencias agregado a partir de todos
los miembros del grupo (persona prototípica) y lo compara con los vectores
de cada lugar usando similitud coseno.

Módulos internos:
  1. Feature space & mappings   – definición del espacio compartido de características
  2. Vectorización de respuestas – quiz → vector
  3. Vectorización de lugares   – atributos JSON → vector
  4. Persona prototípica         – agregación grupal
  5. Similitud coseno            – comparación vectorial
  6. Motor de ranking            – ordenamiento y selección
  7. Explicabilidad              – generación de insights
  8. Punto de entrada            – recomendar_lugares()
"""

import json
import math
from collections import defaultdict
from pathlib import Path
from typing import Any

BASE_DIR = Path(__file__).resolve().parent
LUGARES_FILE = BASE_DIR / "lugares.json"


# ══════════════════════════════════════════════════════════════════════════════
# 1. FEATURE SPACE
# ══════════════════════════════════════════════════════════════════════════════

# Espacio unificado de características compartido entre quiz y lugares
ALL_FEATURES = [
    # — Actividades / intereses
    "salsa",            # salsa, música caleña
    "musica_vivo",      # música en vivo
    "vida_nocturna",    # rumba, bares, noche
    "gastronomia",      # comer rico, restaurantes
    "gastronomia_tipica",  # comida típica caleña
    "cafe_conv",        # café, conversación, relax
    "cultura",          # museos, patrimonio, historia
    "arte",             # arte visual, teatro, expresión
    "naturaleza",       # naturaleza, espacios verdes
    "deporte",          # actividad física, senderismo
    "turismo_famoso",   # íconos turísticos conocidos
    "joyas_locales",    # hidden gems, lugares locales
    "explorar_ciudad",  # exploración urbana
    "mercados",         # mercados, tiendas locales
    "planes_sociales",  # actividades grupales, social
    # — Ambiente
    "tranquilo",        # paz, calma, sin prisa
    "animado",          # energía, movimiento
    "familiar",         # apto para familias
    "romantico",        # ambiente romántico
    "bohemio",          # bohemio, artístico, informal
    "moderno",          # contemporáneo, trendy
    "autentico",        # local, genuino, tradicional
    # — Franja horaria
    "manana",           # mañana
    "tarde",            # tarde
    "noche",            # noche
    # — Otros atributos
    "al_aire_libre",    # espacio exterior
    "economico",        # precio bajo / gratuito
    "premium",          # experiencia especial / cara
]

# Etiquetas legibles para los insights
FEATURE_LABELS: dict[str, str] = {
    "salsa":            "salsa caleña",
    "musica_vivo":      "música en vivo",
    "vida_nocturna":    "vida nocturna",
    "gastronomia":      "gastronomía",
    "gastronomia_tipica": "gastronomía típica caleña",
    "cafe_conv":        "café y conversación",
    "cultura":          "experiencias culturales",
    "arte":             "arte y expresión artística",
    "naturaleza":       "naturaleza y espacios abiertos",
    "deporte":          "actividad física",
    "turismo_famoso":   "lugares turísticos emblemáticos",
    "joyas_locales":    "joyas ocultas y locales",
    "explorar_ciudad":  "exploración urbana",
    "mercados":         "mercados y tiendas locales",
    "planes_sociales":  "planes sociales grupales",
    "tranquilo":        "ambientes tranquilos",
    "animado":          "ambientes animados",
    "familiar":         "planes familiares",
    "romantico":        "ambiente romántico",
    "bohemio":          "vibra bohemia",
    "moderno":          "lugares modernos",
    "autentico":        "autenticidad local",
    "manana":           "mañana",
    "tarde":            "tarde",
    "noche":            "noche",
    "al_aire_libre":    "espacios al aire libre",
    "economico":        "opciones económicas",
    "premium":          "experiencias especiales",
}


# ══════════════════════════════════════════════════════════════════════════════
# 2. MAPPINGS: QUIZ → FEATURES
# ══════════════════════════════════════════════════════════════════════════════

# — Pregunta 4: Tipo de salida
TIPO_SALIDA_FEATURES: dict[str, dict[str, float]] = {
    "manana":          {"manana": 1.0, "al_aire_libre": 0.4, "tranquilo": 0.3},
    "tarde":           {"tarde": 1.0, "animado": 0.3},
    "noche_tranquila": {"noche": 0.8, "tranquilo": 0.7},
    "todo_el_dia":     {"manana": 0.6, "tarde": 0.6, "noche": 0.4},
}

# — Pregunta 5: Actividades (multi-select)
ACTIVIDADES_FEATURES: dict[str, dict[str, float]] = {
    "comer":           {"gastronomia": 1.0, "gastronomia_tipica": 0.3},
    "lugares_bonitos": {"turismo_famoso": 0.6, "joyas_locales": 0.5, "arte": 0.3},
    "cultural":        {"cultura": 1.0, "arte": 0.6},
    "relajarse":       {"tranquilo": 1.0, "naturaleza": 0.4, "cafe_conv": 0.3},
    "explorar_ciudad": {"explorar_ciudad": 1.0, "joyas_locales": 0.5, "turismo_famoso": 0.3},
    "hablar_tiempo":   {"cafe_conv": 1.0, "tranquilo": 0.7, "planes_sociales": 0.5},
    "lugares_nuevos":  {"joyas_locales": 1.0, "explorar_ciudad": 0.5, "autentico": 0.4},
    "mercados":        {"mercados": 1.0, "gastronomia_tipica": 0.6, "autentico": 0.5},
}

# — Pregunta 6: Experiencia a priorizar
EXPERIENCIA_FEATURES: dict[str, dict[str, float]] = {
    "cultural":     {"cultura": 1.0, "arte": 0.7},
    "gastronomica": {"gastronomia": 0.9, "gastronomia_tipica": 0.7},
    "turistica":    {"turismo_famoso": 1.0, "explorar_ciudad": 0.4},
    "naturaleza":   {"naturaleza": 1.0, "al_aire_libre": 0.8, "deporte": 0.3},
    "cafe_conv":    {"cafe_conv": 1.0, "tranquilo": 0.7, "bohemio": 0.3},
    "urbana":       {"explorar_ciudad": 1.0, "planes_sociales": 0.6, "joyas_locales": 0.4},
}

# — Pregunta 2 (reemplaza mood): Energía del parche
ENERGIA_FEATURES: dict[str, dict[str, float]] = {
    "relax":            {"tranquilo": 1.0, "cafe_conv": 0.4},
    "curiosos":         {"joyas_locales": 0.8, "cultura": 0.5, "explorar_ciudad": 0.6},
    "tranquilo_comida": {"gastronomia": 0.9, "tranquilo": 0.7, "cafe_conv": 0.4},
    "recorrer":         {"explorar_ciudad": 0.9, "turismo_famoso": 0.6, "al_aire_libre": 0.5, "animado": 0.4},
}

# — Pregunta 8: Vibe visual
VIBE_FEATURES: dict[str, dict[str, float]] = {
    "sunset_urbano": {"animado": 0.9, "tarde": 0.8, "moderno": 0.5, "planes_sociales": 0.5},
    "cafe_acogedor": {"cafe_conv": 1.0, "tranquilo": 0.8, "bohemio": 0.6},
    "arte_cultura":  {"arte": 1.0, "cultura": 0.9, "bohemio": 0.5},
    "naturaleza":    {"naturaleza": 1.0, "al_aire_libre": 0.9, "tranquilo": 0.4},
    "foodie":        {"gastronomia": 1.0, "gastronomia_tipica": 0.5, "animado": 0.4},
    "hidden_gems":   {"joyas_locales": 1.0, "autentico": 0.9, "bohemio": 0.4},
}

# ── Legacy fields (quiz original: disponibilidad, lugares, mood, franja) ──────

LUGARES_LEGACY_FEATURES: dict[str, dict[str, float]] = {
    "rooftop":    {"vida_nocturna": 0.6, "animado": 0.8, "tarde": 0.5, "moderno": 0.4},
    "salsa":      {"salsa": 1.0, "musica_vivo": 0.7, "vida_nocturna": 0.6, "noche": 0.6},
    "brunch":     {"gastronomia": 0.8, "manana": 0.5, "tarde": 0.4, "tranquilo": 0.3},
    "rumba":      {"vida_nocturna": 0.9, "animado": 0.9, "noche": 0.8, "planes_sociales": 0.5},
    "cafe":       {"cafe_conv": 1.0, "tranquilo": 0.7, "bohemio": 0.3},
    "cultura":    {"cultura": 1.0, "arte": 0.6},
    "gastro":     {"gastronomia": 0.9, "gastronomia_tipica": 0.5},
    "naturaleza": {"naturaleza": 1.0, "al_aire_libre": 0.8, "tranquilo": 0.4},
}

MOOD_LEGACY_FEATURES: dict[str, dict[str, float]] = {
    "chill":     {"tranquilo": 1.0, "cafe_conv": 0.4},
    "social":    {"planes_sociales": 1.0, "animado": 0.7},
    "fiesta":    {"vida_nocturna": 1.0, "animado": 0.9, "noche": 0.8},
    "romantico": {"romantico": 1.0, "tranquilo": 0.5},
    "aventura":  {"deporte": 0.7, "al_aire_libre": 0.6, "joyas_locales": 0.5},
    "creativo":  {"arte": 0.8, "bohemio": 0.7, "cultura": 0.5},
}

FRANJA_LEGACY_FEATURES: dict[str, dict[str, float]] = {
    "dia":   {"manana": 1.0},
    "tarde": {"tarde": 1.0},
    "noche": {"noche": 1.0},
}

# Días de disponibilidad → franja de tiempo
DISPONIBILIDAD_FRANJA: dict[str, dict[str, float]] = {
    "sab": {"noche": 0.6, "animado": 0.4},
    "dom": {"manana": 0.5, "tarde": 0.5},
    "vie": {"noche": 0.5, "tarde": 0.3},
}


# ══════════════════════════════════════════════════════════════════════════════
# 3. MAPPINGS: LUGAR → FEATURES
# ══════════════════════════════════════════════════════════════════════════════

CATEGORIA_FEATURES: dict[str, dict[str, float]] = {
    "salsa":              {"salsa": 1.0, "musica_vivo": 0.8, "vida_nocturna": 0.9, "animado": 0.9, "noche": 0.7, "planes_sociales": 0.7},
    "mirador":            {"turismo_famoso": 0.7, "naturaleza": 0.6, "al_aire_libre": 0.9, "tarde": 0.5},
    "museo":              {"cultura": 1.0, "arte": 0.8, "turismo_famoso": 0.5, "tranquilo": 0.5},
    "cafe":               {"cafe_conv": 1.0, "tranquilo": 0.8, "bohemio": 0.4},
    "restaurante":        {"gastronomia": 1.0},
    "gastronomia_tipica": {"gastronomia": 0.8, "gastronomia_tipica": 1.0, "autentico": 0.8},
    "barrio_patrimonio":  {"turismo_famoso": 0.6, "joyas_locales": 0.8, "cultura": 0.7, "bohemio": 0.7, "autentico": 0.6},
    "espacio_publico":    {"al_aire_libre": 0.9, "planes_sociales": 0.8, "animado": 0.5, "familiar": 0.5},
    "teatro":             {"cultura": 0.9, "arte": 1.0, "tranquilo": 0.5, "premium": 0.3},
    "espacio_cultural":   {"cultura": 1.0, "arte": 0.7, "autentico": 0.8, "planes_sociales": 0.4},
    "atraccion_turistica":{"turismo_famoso": 0.9, "naturaleza": 0.5, "familiar": 0.6, "al_aire_libre": 0.5},
}

TAGS_FEATURES: dict[str, dict[str, float]] = {
    "salsa":           {"salsa": 1.0, "musica_vivo": 0.5},
    "música":          {"musica_vivo": 0.9},
    "cultura caleña":  {"autentico": 0.8, "cultura": 0.6},
    "vida nocturna":   {"vida_nocturna": 1.0, "noche": 0.8, "animado": 0.5},
    "rumba":           {"vida_nocturna": 0.9, "animado": 0.8, "noche": 0.7},
    "baile":           {"salsa": 0.7, "planes_sociales": 0.5},
    "gastronomía":     {"gastronomia": 1.0},
    "típico caleño":   {"gastronomia_tipica": 1.0, "autentico": 0.9},
    "cultural":        {"cultura": 1.0},
    "arte":            {"arte": 0.9},
    "museo":           {"cultura": 0.8, "arte": 0.7, "tranquilo": 0.4},
    "historia":        {"cultura": 0.7, "turismo_famoso": 0.5},
    "histórico":       {"cultura": 0.7, "turismo_famoso": 0.5},
    "naturaleza":      {"naturaleza": 1.0, "al_aire_libre": 0.7},
    "senderismo":      {"deporte": 0.9, "naturaleza": 0.7, "al_aire_libre": 0.9},
    "deporte":         {"deporte": 1.0, "al_aire_libre": 0.6},
    "tranquilo":       {"tranquilo": 1.0},
    "café":            {"cafe_conv": 1.0},
    "bohemio":         {"bohemio": 1.0},
    "turístico":       {"turismo_famoso": 0.7},
    "al aire libre":   {"al_aire_libre": 1.0},
    "económico":       {"economico": 0.9},
    "moderno":         {"moderno": 0.8},
    "afrocolombiano":  {"autentico": 1.0, "cultura": 0.8},
    "foto":            {"joyas_locales": 0.4, "turismo_famoso": 0.5},
    "teatro":          {"arte": 0.9, "cultura": 0.8},
    "danza":           {"salsa": 0.5, "arte": 0.6, "cultura": 0.5},
    "eventos":         {"planes_sociales": 0.7, "cultura": 0.4},
    "bar":             {"vida_nocturna": 0.7, "animado": 0.7, "noche": 0.5},
    "restaurante":     {"gastronomia": 0.9},
    "postre":          {"gastronomia_tipica": 0.7, "gastronomia": 0.5},
    "jugos":           {"gastronomia_tipica": 0.6, "gastronomia": 0.5},
    "mariscos":        {"gastronomia": 0.9},
    "fusión":          {"gastronomia": 0.7, "moderno": 0.5},
    "cena":            {"gastronomia": 0.8, "noche": 0.4},
    "almuerzo":        {"gastronomia": 0.7, "tarde": 0.3},
    "espacio público": {"al_aire_libre": 0.8, "planes_sociales": 0.7},
    "mercado":         {"mercados": 1.0, "gastronomia": 0.4},
    "prehispánico":    {"cultura": 0.8, "turismo_famoso": 0.6},
    "arqueología":     {"cultura": 0.9, "turismo_famoso": 0.5},
    "exposiciones":    {"arte": 0.8, "cultura": 0.7},
    "arquitectura":    {"cultura": 0.5, "turismo_famoso": 0.5},
    "comida vallecaucana": {"gastronomia_tipica": 1.0, "autentico": 0.7},
    "comunidad":       {"autentico": 0.7, "planes_sociales": 0.5},
}

AMBIENTE_FEATURES: dict[str, dict[str, float]] = {
    "tranquilo":   {"tranquilo": 1.0},
    "romántico":   {"romantico": 1.0, "tranquilo": 0.3},
    "familiar":    {"familiar": 1.0},
    "activo":      {"deporte": 0.7, "animado": 0.5},
    "natural":     {"naturaleza": 0.9, "al_aire_libre": 0.7},
    "cultural":    {"cultura": 1.0},
    "educativo":   {"cultura": 0.7, "tranquilo": 0.3},
    "animado":     {"animado": 1.0, "planes_sociales": 0.5},
    "casual":      {"tranquilo": 0.3, "economico": 0.4},
    "social":      {"planes_sociales": 1.0, "animado": 0.6},
    "nocturno":    {"noche": 0.9, "vida_nocturna": 0.7},
    "auténtico":   {"autentico": 1.0},
    "bohemio":     {"bohemio": 1.0, "arte": 0.4},
    "moderno":     {"moderno": 1.0},
    "especial":    {"premium": 0.6},
    "popular":     {"economico": 0.4, "gastronomia_tipica": 0.3, "autentico": 0.3},
    "relajado":    {"tranquilo": 0.8},
    "amigable":    {"planes_sociales": 0.5},
    "formal":      {"premium": 0.5, "tranquilo": 0.4},
    "bullicioso":  {"animado": 0.7, "gastronomia_tipica": 0.3},
    "artístico":   {"arte": 0.9, "bohemio": 0.5},
    "comunitario": {"autentico": 0.7, "planes_sociales": 0.5},
    "acogedor":    {"cafe_conv": 0.7, "tranquilo": 0.6},
}

IDEAL_PARA_FEATURES: dict[str, dict[str, float]] = {
    "grupos de amigos": {"planes_sociales": 1.0, "animado": 0.5},
    "grupos":           {"planes_sociales": 0.8},
    "turistas":         {"turismo_famoso": 0.6},
    "familias":         {"familiar": 1.0},
    "familias con niños": {"familiar": 1.0, "al_aire_libre": 0.4},
    "parejas":          {"romantico": 0.8, "tranquilo": 0.3},
    "deportistas":      {"deporte": 1.0, "al_aire_libre": 0.7},
    "estudiantes":      {"cultura": 0.5, "economico": 0.5},
    "jóvenes":          {"vida_nocturna": 0.3, "animado": 0.5},
    "amantes del arte": {"arte": 1.0, "cultura": 0.6},
    "amantes de la salsa": {"salsa": 1.0, "musica_vivo": 0.6},
    "amantes de la gastronomía": {"gastronomia": 1.0},
    "fotógrafos":       {"joyas_locales": 0.6, "turismo_famoso": 0.5},
    "lectores":         {"cafe_conv": 0.8, "tranquilo": 0.7},
    "trabajadores remotos": {"cafe_conv": 0.9, "tranquilo": 0.7},
    "turistas culturales": {"cultura": 0.8, "turismo_famoso": 0.5},
    "amantes del mar":  {"gastronomia": 0.7},
    "interesados en cultura afrocolombiana": {"autentico": 0.9, "cultura": 0.8},
    "adultos":          {"animado": 0.4},
    "todos":            {"economico": 0.3},
    "locales":          {"autentico": 0.7, "joyas_locales": 0.5},
    "principiantes en salsa": {"salsa": 0.7, "planes_sociales": 0.5},
    "amantes de la historia": {"cultura": 0.9, "turismo_famoso": 0.5},
    "amantes del arte y la música": {"arte": 0.8, "musica_vivo": 0.7},
    "grupos culturales": {"cultura": 0.8, "planes_sociales": 0.5},
    "turistas con presupuesto": {"premium": 0.5, "gastronomia": 0.5},
}

PRECIO_FEATURES: dict[int, dict[str, float]] = {
    0: {"economico": 1.0},
    1: {"economico": 0.6},
    2: {},
    3: {"premium": 0.8},
}


# ══════════════════════════════════════════════════════════════════════════════
# 4. VECTORIZACIÓN
# ══════════════════════════════════════════════════════════════════════════════

def _apply_mapping(
    result: dict[str, float],
    mapping: dict[str, dict[str, float]],
    key: str | None,
    weight: float = 1.0,
) -> None:
    """Apply a single-select mapping into result dict."""
    if key and key in mapping:
        for feat, val in mapping[key].items():
            result[feat] = result.get(feat, 0.0) + val * weight


def _apply_multiselect_mapping(
    result: dict[str, float],
    mapping: dict[str, dict[str, float]],
    keys: list[str],
    weight: float = 1.0,
) -> None:
    """Apply a multi-select mapping, averaging contributions per item."""
    if not keys:
        return
    for key in keys:
        if key in mapping:
            for feat, val in mapping[key].items():
                result[feat] = result.get(feat, 0.0) + val * weight


def answers_to_vector(answers: dict[str, Any]) -> dict[str, float]:
    """
    Convert a member's quiz answers to a sparse feature vector.
    Handles both new fields (tipoSalida, actividades, experiencia, energia,
    tiempo, vibe) and legacy fields (disponibilidad, lugares, mood, franja).
    Missing or None values are silently ignored.
    """
    vec: dict[str, float] = {}

    # ── New quiz fields ────────────────────────────────────────────────
    _apply_mapping(vec, TIPO_SALIDA_FEATURES, answers.get("tipoSalida"), weight=0.15)

    actividades = answers.get("actividades") or []
    if actividades:
        _apply_multiselect_mapping(vec, ACTIVIDADES_FEATURES, actividades, weight=0.25 / max(len(actividades), 1))

    _apply_mapping(vec, EXPERIENCIA_FEATURES, answers.get("experiencia"), weight=0.20)
    _apply_mapping(vec, ENERGIA_FEATURES, answers.get("energia"), weight=0.15)
    _apply_mapping(vec, VIBE_FEATURES, answers.get("vibe"), weight=0.15)

    # ── Legacy fields ──────────────────────────────────────────────────
    legacy_lugares = answers.get("lugares") or []
    if legacy_lugares:
        _apply_multiselect_mapping(vec, LUGARES_LEGACY_FEATURES, legacy_lugares, weight=0.10 / max(len(legacy_lugares), 1))

    _apply_mapping(vec, MOOD_LEGACY_FEATURES, answers.get("mood"), weight=0.05)
    _apply_mapping(vec, FRANJA_LEGACY_FEATURES, answers.get("franja"), weight=0.05)

    disponibilidad = answers.get("disponibilidad") or []
    for dia in disponibilidad:
        if dia in DISPONIBILIDAD_FRANJA:
            for feat, val in DISPONIBILIDAD_FRANJA[dia].items():
                vec[feat] = vec.get(feat, 0.0) + val * 0.02

    return vec


def lugar_to_vector(lugar: dict[str, Any]) -> dict[str, float]:
    """
    Convert a lugar's JSON attributes into a feature vector.
    Uses: categoria, tags, ambiente, ideal_para, precio_rango, al_aire_libre.
    """
    vec: dict[str, float] = {}

    # categoria (peso alto)
    cat = lugar.get("categoria", "")
    if cat in CATEGORIA_FEATURES:
        for feat, val in CATEGORIA_FEATURES[cat].items():
            vec[feat] = vec.get(feat, 0.0) + val * 0.35

    # tags
    tags = lugar.get("tags") or []
    for tag in tags:
        tag_lower = tag.lower()
        if tag_lower in TAGS_FEATURES:
            for feat, val in TAGS_FEATURES[tag_lower].items():
                vec[feat] = vec.get(feat, 0.0) + val * (0.25 / max(len(tags), 1))

    # ambiente
    ambientes = lugar.get("ambiente") or []
    for amb in ambientes:
        amb_lower = amb.lower()
        if amb_lower in AMBIENTE_FEATURES:
            for feat, val in AMBIENTE_FEATURES[amb_lower].items():
                vec[feat] = vec.get(feat, 0.0) + val * (0.20 / max(len(ambientes), 1))

    # ideal_para
    ideal = lugar.get("ideal_para") or []
    for i_label in ideal:
        i_lower = i_label.lower()
        if i_lower in IDEAL_PARA_FEATURES:
            for feat, val in IDEAL_PARA_FEATURES[i_lower].items():
                vec[feat] = vec.get(feat, 0.0) + val * (0.10 / max(len(ideal), 1))

    # precio_rango
    precio_rango = lugar.get("precio_rango", 1)
    if precio_rango in PRECIO_FEATURES:
        for feat, val in PRECIO_FEATURES[precio_rango].items():
            vec[feat] = vec.get(feat, 0.0) + val * 0.05

    # al_aire_libre
    if lugar.get("al_aire_libre"):
        vec["al_aire_libre"] = vec.get("al_aire_libre", 0.0) + 0.05

    return vec


# ══════════════════════════════════════════════════════════════════════════════
# 5. PERSONA PROTOTÍPICA
# ══════════════════════════════════════════════════════════════════════════════

def _normalize_vector(vec: dict[str, float]) -> dict[str, float]:
    """Clamp values to [0, 1]."""
    if not vec:
        return vec
    max_val = max(vec.values())
    if max_val == 0:
        return vec
    return {k: min(v / max_val, 1.0) for k, v in vec.items()}


def build_prototypic_person(quiz_answers_input: Any) -> dict[str, Any]:
    """
    Construct the group's prototypic person from all member answers.

    Parameters
    ----------
    quiz_answers_input : dict | list | None
        - dict: {member_id: {quiz_answers}} (new format from Supabase)
        - list: [{quiz_answers}, ...] (legacy format)
        - None / empty: returns a neutral vector

    Returns
    -------
    dict with:
        'vector'        : normalized feature vector {feature: 0.0-1.0}
        'participantes' : number of members who answered
        'consenso'      : dict of features with high group agreement (≥ 0.5)
        'diversidad'    : number of distinct high features
    """
    if not quiz_answers_input:
        return {
            "vector": {},
            "participantes": 0,
            "consenso": {},
            "diversidad": 0,
        }

    # Normalize to list of answer dicts
    if isinstance(quiz_answers_input, dict):
        answer_list = [v for v in quiz_answers_input.values() if isinstance(v, dict)]
    elif isinstance(quiz_answers_input, list):
        answer_list = [a for a in quiz_answers_input if isinstance(a, dict)]
    else:
        answer_list = []

    if not answer_list:
        return {
            "vector": {},
            "participantes": 0,
            "consenso": {},
            "diversidad": 0,
        }

    n = len(answer_list)
    aggregated: dict[str, float] = defaultdict(float)

    for answers in answer_list:
        member_vec = answers_to_vector(answers)
        for feat, val in member_vec.items():
            aggregated[feat] += val

    # Average across members
    averaged = {feat: val / n for feat, val in aggregated.items() if val > 0}

    # Normalize to [0, 1]
    vector = _normalize_vector(averaged)

    # Consenso: features with normalized value ≥ 0.5
    consenso = {k: round(v, 3) for k, v in vector.items() if v >= 0.5}

    return {
        "vector": {k: round(v, 3) for k, v in sorted(vector.items(), key=lambda x: -x[1])},
        "participantes": n,
        "consenso": consenso,
        "diversidad": len(consenso),
    }


# ══════════════════════════════════════════════════════════════════════════════
# 6. SIMILITUD COSENO
# ══════════════════════════════════════════════════════════════════════════════

def cosine_similarity(vec_a: dict[str, float], vec_b: dict[str, float]) -> float:
    """
    Compute cosine similarity between two sparse feature vectors.
    Returns a value in [0.0, 1.0]. Returns 0.0 if either vector is empty.
    """
    if not vec_a or not vec_b:
        return 0.0

    all_keys = set(vec_a) | set(vec_b)
    dot = sum(vec_a.get(k, 0.0) * vec_b.get(k, 0.0) for k in all_keys)
    norm_a = math.sqrt(sum(v ** 2 for v in vec_a.values()))
    norm_b = math.sqrt(sum(v ** 2 for v in vec_b.values()))

    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0

    return min(dot / (norm_a * norm_b), 1.0)


# ══════════════════════════════════════════════════════════════════════════════
# 7. MOTOR DE RANKING + EXPLICABILIDAD
# ══════════════════════════════════════════════════════════════════════════════

def _top_shared_features(
    lugar_vec: dict[str, float],
    proto_vec: dict[str, float],
    n: int = 3,
    threshold: float = 0.25,
) -> list[str]:
    """Return the top N features that both vectors have above threshold."""
    contributions: dict[str, float] = {}
    for feat in set(lugar_vec) & set(proto_vec):
        lv = lugar_vec.get(feat, 0.0)
        pv = proto_vec.get(feat, 0.0)
        if lv >= threshold and pv >= threshold:
            contributions[feat] = lv * pv
    return [f for f, _ in sorted(contributions.items(), key=lambda x: -x[1])[:n]]


def generate_explanation(
    lugar: dict[str, Any],
    lugar_vec: dict[str, float],
    proto_vec: dict[str, float],
    similarity: float,
) -> str:
    """
    Generate a specific, attribute-derived explanation for a recommendation.
    Avoids generic text — uses real shared features between lugar and proto.
    """
    top_feats = _top_shared_features(lugar_vec, proto_vec, n=3)

    if not top_feats:
        return (
            f"{lugar.get('nombre', 'Este lugar')} encaja con el perfil general del grupo."
        )

    labels = [FEATURE_LABELS.get(f, f) for f in top_feats]

    if len(labels) == 1:
        feat_text = labels[0]
    elif len(labels) == 2:
        feat_text = f"{labels[0]} y {labels[1]}"
    else:
        feat_text = f"{labels[0]}, {labels[1]} y {labels[2]}"

    pct = round(similarity * 100)
    return (
        f"Se recomienda porque el grupo mostró alta afinidad por {feat_text} "
        f"({pct}% de compatibilidad)."
    )


def _group_insights(
    proto: dict[str, Any],
    top_lugares: list[dict[str, Any]],
) -> list[str]:
    """Generate 3 group-level insights from the prototypic person."""
    vector = proto.get("vector", {})
    n_participantes = proto.get("participantes", 0)
    insights: list[str] = []

    if not vector:
        return ["El parche generó una recomendación personalizada para Cali. 🔥"]

    # Insight 1: top preference
    top_feat = max(vector.items(), key=lambda x: x[1], default=(None, 0))
    if top_feat[0]:
        label = FEATURE_LABELS.get(top_feat[0], top_feat[0])
        pct = round(top_feat[1] * 100)
        insights.append(f"La preferencia más fuerte del grupo es {label} ({pct}% de intensidad).")

    # Insight 2: lugar highlight
    if top_lugares:
        best = top_lugares[0]
        insights.append(
            f"{best.get('emoji', '📍')} {best.get('nombre', '')} lidera la compatibilidad grupal "
            f"con {best.get('match_pct', 0)}%."
        )

    # Insight 3: participation or secondary feature
    if n_participantes > 1:
        consenso_keys = list(proto.get("consenso", {}).keys())
        if len(consenso_keys) >= 2:
            second_label = FEATURE_LABELS.get(consenso_keys[1], consenso_keys[1])
            insights.append(
                f"El grupo también coincide en {second_label} — {n_participantes} personas respondieron el quiz."
            )
        else:
            insights.append(f"{n_participantes} integrantes respondieron el quiz. ¡Buen parche!")
    elif n_participantes == 1:
        insights.append("Solo un integrante respondió el quiz. Las recomendaciones mejorarán con más respuestas.")

    return insights[:3]


# ══════════════════════════════════════════════════════════════════════════════
# 8. CARGA DE LUGARES
# ══════════════════════════════════════════════════════════════════════════════

def _cargar_lugares() -> list[dict[str, Any]]:
    with LUGARES_FILE.open("r", encoding="utf-8") as f:
        return json.load(f)


def _emoji_for_lugar(lugar: dict[str, Any]) -> str:
    """Derive a representative emoji from the lugar's category/tags."""
    emoji_map = {
        "salsa": "💃", "mirador": "🌇", "museo": "🎨", "cafe": "☕",
        "restaurante": "🍽️", "gastronomia_tipica": "🥘", "barrio_patrimonio": "🏘️",
        "espacio_publico": "🌳", "teatro": "🎭", "espacio_cultural": "🎶",
        "atraccion_turistica": "📍",
    }
    cat = lugar.get("categoria", "")
    return emoji_map.get(cat, "✨")


# ══════════════════════════════════════════════════════════════════════════════
# 9. PUNTO DE ENTRADA PRINCIPAL
# ══════════════════════════════════════════════════════════════════════════════

def recomendar_lugares(
    miembros: list[Any],
    quiz_answers_input: Any = None,
    top_n: int = 4,
    exclude_places: list = [],  # ← agregar esto
) -> dict[str, Any]:
    """
    Main recommendation function.

    Parameters
    ----------
    miembros         : list of member dicts from group_details.members
    quiz_answers_input : dict {member_id: quiz_answers} or list of quiz_answers
    top_n            : number of places to return (default 4)

    Returns
    -------
    {
        'persona_prototipica': {vector, participantes, consenso, diversidad},
        'top_lugares'        : list of scored/explained places,
        'score'              : int 0-100 (best similarity × 100),
        'insights'           : list[str],
        'explicacion'        : str (global summary),
        'saved'              : bool (set by caller),
    }
    """
    lugares_data = _cargar_lugares()
    # Filtrar lugares excluidos
    if exclude_places:
        lugares_data = [l for l in lugares_data if l.get("id") not in exclude_places]

    # Build prototypic person
    proto = build_prototypic_person(quiz_answers_input)
    proto_vec = proto.get("vector", {})

    # Vectorize all lugares and compute similarity
    ranked: list[dict[str, Any]] = []
    for lugar in lugares_data:
        lugar_vec = lugar_to_vector(lugar)
        sim = cosine_similarity(proto_vec, lugar_vec)

        emoji = _emoji_for_lugar(lugar)
        match_pct = round(sim * 100)

        ranked.append({
            **lugar,
            "emoji": emoji,
            "similarity": sim,
            "match_pct": match_pct,
            "explicacion": generate_explanation(lugar, lugar_vec, proto_vec, sim),
        })

    # Fallback: if no answers, rank by precio_rango asc (most accessible first)
    if not proto_vec:
        ranked.sort(key=lambda x: (x.get("precio_rango", 2), -x.get("id", 0)))
    else:
        ranked.sort(key=lambda x: -x["similarity"])

    top = ranked[:top_n]

    # Compute group compatibility score (average of top N similarities × 100)
    if proto_vec and top:
        avg_sim = sum(x["similarity"] for x in top) / len(top)
        score = min(int(round(avg_sim * 100 * 1.15)), 99)  # slight boost for engagement
    else:
        score = 0

    # Insights
    insights = _group_insights(proto, top)

    # Global explanation summary
    top_feats = list(proto.get("consenso", {}).keys())[:3]
    if top_feats:
        feat_labels = [FEATURE_LABELS.get(f, f) for f in top_feats]
        explicacion = (
            "El parche tiene un perfil grupal centrado en "
            + ", ".join(feat_labels)
            + ". Las recomendaciones priorizan estos intereses compartidos."
        )
    else:
        explicacion = "Recomendaciones personalizadas para el parche en Cali."

    # Clean output (remove internal keys from top_lugares)
    top_lugares_clean = []
    for item in top:
        entry = {k: v for k, v in item.items() if k != "similarity"}
        top_lugares_clean.append(entry)

    return {
        "persona_prototipica": proto,
        "top_lugares": top_lugares_clean,
        "score": score,
        "insights": insights,
        "explicacion": explicacion,
    }
