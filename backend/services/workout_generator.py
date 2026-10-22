from __future__ import annotations

from typing import Any

from services.exercise_library import EXERCISE_LIBRARY

# Parâmetros por objetivo (determinístico).
OBJETIVOS: dict[str, dict[str, Any]] = {
    "hipertrofia": {
        "series": 3,
        "rep_min": 8,
        "rep_max": 12,
        "descanso": "60-90s",
        "cardio": False,
    },
    "forca": {
        "series": 4,
        "rep_min": 4,
        "rep_max": 6,
        "descanso": "120-180s",
        "cardio": False,
    },
    "emagrecimento": {
        "series": 3,
        "rep_min": 12,
        "rep_max": 15,
        "descanso": "30-45s",
        "cardio": True,
    },
    "condicionamento": {
        "series": 2,
        "rep_min": 10,
        "rep_max": 15,
        "descanso": "45-60s",
        "cardio": True,
    },
}

# Divisão de treino por quantidade de dias/semana.
# Cada entrada: (nome do treino, [grupos musculares do dia]).
SPLITS: dict[int, list[tuple[str, list[str]]]] = {
    2: [
        ("Treino A — Full Body", ["peito", "costas", "pernas", "ombros", "abdomen"]),
        ("Treino B — Full Body", ["pernas", "costas", "peito", "biceps", "triceps"]),
    ],
    3: [
        ("Treino A — Push (empurrar)", ["peito", "ombros", "triceps"]),
        ("Treino B — Pull (puxar)", ["costas", "biceps"]),
        ("Treino C — Legs (pernas)", ["pernas", "abdomen"]),
    ],
    4: [
        ("Treino A — Superior", ["peito", "costas", "ombros", "biceps", "triceps"]),
        ("Treino B — Inferior", ["pernas", "abdomen"]),
        ("Treino C — Superior", ["costas", "peito", "ombros", "triceps", "biceps"]),
        ("Treino D — Inferior", ["pernas", "abdomen"]),
    ],
    5: [
        ("Treino A — Peito", ["peito", "triceps"]),
        ("Treino B — Costas", ["costas", "biceps"]),
        ("Treino C — Pernas", ["pernas", "abdomen"]),
        ("Treino D — Ombros", ["ombros", "abdomen"]),
        ("Treino E — Braços", ["biceps", "triceps"]),
    ],
    6: [
        ("Treino A — Push", ["peito", "ombros", "triceps"]),
        ("Treino B — Pull", ["costas", "biceps"]),
        ("Treino C — Legs", ["pernas", "abdomen"]),
        ("Treino D — Push", ["peito", "ombros", "triceps"]),
        ("Treino E — Pull", ["costas", "biceps"]),
        ("Treino F — Legs", ["pernas", "abdomen"]),
    ],
}

_OBJETIVO_LABEL = {
    "hipertrofia": "hipertrofia",
    "forca": "força",
    "emagrecimento": "emagrecimento",
    "condicionamento": "condicionamento geral",
}


def _normalizar_objetivo(objetivo: str | None) -> str:
    if not objetivo:
        return "hipertrofia"
    key = objetivo.strip().lower()
    aliases = {
        "hipertrofia": "hipertrofia",
        "massa": "hipertrofia",
        "ganho de massa": "hipertrofia",
        "forca": "forca",
        "força": "forca",
        "emagrecimento": "emagrecimento",
        "emagrecer": "emagrecimento",
        "perda de peso": "emagrecimento",
        "definicao": "emagrecimento",
        "definição": "emagrecimento",
        "condicionamento": "condicionamento",
        "saude": "condicionamento",
        "saúde": "condicionamento",
    }
    return aliases.get(key, "hipertrofia")


def _imc(peso: Any, altura_cm: Any) -> dict[str, Any] | None:
    try:
        p = float(peso)
        a = float(altura_cm)
    except (TypeError, ValueError):
        return None
    if p <= 0 or a <= 0:
        return None

    valor = p / ((a / 100) ** 2)
    if valor < 18.5:
        classificacao = "abaixo do peso"
    elif valor < 25:
        classificacao = "peso normal"
    elif valor < 30:
        classificacao = "sobrepeso"
    else:
        classificacao = "obesidade"

    return {"valor": round(valor, 1), "classificacao": classificacao}


def _distribuir(n_grupos: int, total: int = 6) -> list[int]:
    """Distribui ~`total` exercícios entre os grupos do dia."""
    base, resto = divmod(total, n_grupos)
    return [base + (1 if i < resto else 0) for i in range(n_grupos)]


def _selecionar(grupo: str, quantidade: int, offset: int) -> list[dict[str, str]]:
    biblioteca = EXERCISE_LIBRARY.get(grupo, [])
    if not biblioteca:
        return []
    selecionados = []
    for i in range(quantidade):
        item = biblioteca[(offset + i) % len(biblioteca)]
        selecionados.append(
            {"nome": item["nome"], "equipamento": item["equipamento"]}
        )
    return selecionados


def generate_workout_plan(
    *,
    dias_semana: int,
    objetivo: str | None = None,
    peso: float | None = None,
    altura: float | None = None,
    idade: int | None = None,
) -> dict:
    """Gera uma ficha de treino determinística a partir de dados simples.

    Não usa IA nem ML: é uma tabela de regras + biblioteca de exercícios,
    reproduzível e testável (mesmo princípio do motor analítico).
    """
    dias_semana = max(2, min(6, int(dias_semana)))
    objetivo = _normalizar_objetivo(objetivo)
    params = OBJETIVOS[objetivo]

    treinos = []
    for dia_idx, (nome_treino, grupos) in enumerate(SPLITS[dias_semana]):
        quantidades = _distribuir(len(grupos))
        exercicios = []
        for grupo, quantidade in zip(grupos, quantidades):
            for ex in _selecionar(grupo, quantidade, offset=dia_idx):
                exercicios.append(
                    {
                        "nome": ex["nome"],
                        "grupo": grupo,
                        "equipamento": ex["equipamento"],
                        "series": params["series"],
                        "reps": f"{params['rep_min']}-{params['rep_max']}",
                        "descanso": params["descanso"],
                    }
                )
        treinos.append(
            {"dia": dia_idx + 1, "nome": nome_treino, "exercicios": exercicios}
        )

    imc = _imc(peso, altura)

    linhas = [
        f"Plano gerado para {_OBJETIVO_LABEL[objetivo]} com {dias_semana} dia(s) de treino por semana.",
        f"Faixa de repetições {params['rep_min']}-{params['rep_max']} com descanso de {params['descanso']} entre séries.",
    ]
    if imc:
        linhas.append(f"IMC: {imc['valor']} ({imc['classificacao']}).")
    if params["cardio"]:
        linhas.append("Inclua 20-30 minutos de cardio leve ao final de cada treino.")
    if idade is not None and int(idade) >= 50:
        linhas.append("Priorize técnica e amplitude antes de aumentar a carga.")
    linhas.append(
        "Aumente a carga em 2,5-5% quando completar o teto de repetições com boa técnica."
    )

    return {
        "dias_semana": dias_semana,
        "objetivo": objetivo,
        "imc": imc,
        "recomendacao": " ".join(linhas),
        "treinos": treinos,
    }
