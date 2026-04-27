"""
Motor de predição de grupo muscular prioritário.

Fluxo:
  1. Se model.pkl existir → carrega e usa o modelo treinado (scikit-learn).
  2. Se não existir → fallback para heurística de proporções corporais
     (regra de Reeves adaptada) — usado enquanto o dataset não está disponível.

Ao receber o dataset real, treine com train.py e salve o modelo como model.pkl
nesta mesma pasta. O endpoint /api/predict passa a usar o modelo automaticamente.
"""

import os
import math
import joblib
import numpy as np
from pathlib import Path

MODEL_PATH = Path(__file__).parent / "model.pkl"

GRUPOS = [
    "Peitoral e Ombros",
    "Dorsais e Costas",
    "Bíceps e Tríceps",
    "Quadríceps e Posteriores",
    "Panturrilha e Core",
]

# Proporções ideais como fração da altura (baseadas em Steve Reeves / NSP)
IDEAL_RATIOS = {
    "Peitoral e Ombros":       0.535,
    "Dorsais e Costas":        0.520,
    "Bíceps e Tríceps":        0.200,
    "Quadríceps e Posteriores": 0.310,
    "Panturrilha e Core":      0.220,
}

# Mapeamento medida → grupo
MEASURE_MAP = {
    "Peitoral e Ombros":       "peito",
    "Dorsais e Costas":        "peito",   # estimado: 95% do peito
    "Bíceps e Tríceps":        "braco",
    "Quadríceps e Posteriores": "coxa",
    "Panturrilha e Core":      "panturrilha",
}


def _heuristic(data: dict) -> dict:
    """Análise por proporções corporais quando modelo ML não está disponível."""
    altura = float(data.get("altura", 0))
    if altura < 100:
        return {"grupo_prioritario": GRUPOS[0], "confianca": 0.5, "analise": []}

    analise = []
    for grupo in GRUPOS:
        ideal = altura * IDEAL_RATIOS[grupo]
        medida_key = MEASURE_MAP[grupo]
        atual = float(data.get(medida_key) or 0)

        if grupo == "Dorsais e Costas" and not data.get("peito"):
            continue
        if grupo == "Dorsais e Costas":
            atual = float(data["peito"]) * 0.95

        if atual == 0:
            continue

        deficit_pct = ((ideal - atual) / ideal) * 100
        pct_atingido = min(100, round((atual / ideal) * 100))

        analise.append({
            "grupo": grupo,
            "atual_cm": round(atual, 1),
            "ideal_cm": round(ideal, 1),
            "deficit_pct": round(deficit_pct, 1),
            "pct_atingido": pct_atingido,
        })

    if not analise:
        return {"grupo_prioritario": GRUPOS[0], "confianca": 0.5, "analise": []}

    analise.sort(key=lambda x: -x["deficit_pct"])
    top = analise[0]

    # Confiança: quão maior o déficit comparado ao segundo
    confianca = 0.7
    if len(analise) > 1:
        diff = top["deficit_pct"] - analise[1]["deficit_pct"]
        confianca = min(0.97, 0.60 + diff * 0.02)

    return {
        "grupo_prioritario": top["grupo"],
        "confianca": round(confianca, 2),
        "analise": analise,
        "fonte": "heuristica",
    }


def _ml_predict(data: dict, model) -> dict:
    """Usa o modelo sklearn treinado."""
    features = np.array([[
        float(data.get("peso",        0)),
        float(data.get("altura",      0)),
        float(data.get("idade",       0)),
        1 if data.get("sexo") == "M" else 0,
        float(data.get("peito",       0)),
        float(data.get("cintura",     0)),
        float(data.get("quadril",     0)),
        float(data.get("braco",       0)),
        float(data.get("antebraco",   0)),
        float(data.get("coxa",        0)),
        float(data.get("panturrilha", 0)),
        float(data.get("gordura",     0)),
    ]])

    grupo_pred = model.predict(features)[0]
    proba = model.predict_proba(features)[0]
    confianca = float(max(proba))

    return {
        "grupo_prioritario": grupo_pred,
        "confianca": round(confianca, 2),
        "analise": [],
        "fonte": "modelo_ml",
    }


def predict(data: dict) -> dict:
    """Ponto de entrada principal — escolhe ML ou heurística."""
    if MODEL_PATH.exists():
        try:
            model = joblib.load(MODEL_PATH)
            return _ml_predict(data, model)
        except Exception:
            pass
    return _heuristic(data)
