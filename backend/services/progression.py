from __future__ import annotations

from collections import defaultdict
from datetime import date, datetime, timedelta
from typing import Any


def _float(value: Any) -> float | None:
    try:
        if value in (None, ""):
            return None
        return float(value)
    except (TypeError, ValueError):
        return None


def _date(value: Any) -> date | None:
    if not value:
        return None
    text = str(value)
    try:
        return datetime.fromisoformat(text.replace("Z", "+00:00")).date()
    except ValueError:
        try:
            return datetime.strptime(text[:10], "%Y-%m-%d").date()
        except ValueError:
            return None


def _e1rm(peso_kg: float, reps: float) -> float:
    return peso_kg * (1 + reps / 30)


def detect_stalls(
    load_logs: list[dict],
    exercises: list[dict],
    today: date | None = None,
    janela_semanas: int = 3,
) -> list[dict]:
    """Detecta estagnação de carga por exercício.

    Compara o e1RM mais recente (dentro da janela) com o e1RM de referência
    (último registro antes do início da janela). Se não houve progressão,
    gera um alerta orientando o aumento de carga.
    """
    today = today or date.today()
    limite = today - timedelta(weeks=janela_semanas)

    names = {
        str(item.get("id")): item.get("nome", "Exercício sem nome")
        for item in exercises
    }

    grouped: dict[str, list[dict]] = defaultdict(list)
    for log in load_logs:
        grouped[str(log.get("exercise_id"))].append(log)

    alertas = []
    for exercise_id, rows in grouped.items():
        valid = []
        for item in rows:
            d = _date(item.get("data"))
            peso = _float(item.get("peso_kg"))
            reps = _float(item.get("reps"))
            if d is None or peso is None or reps is None:
                continue
            valid.append((d, _e1rm(peso, reps)))
        valid.sort(key=lambda x: x[0])

        baseline = [v for v in valid if v[0] <= limite]
        recentes = [v for v in valid if v[0] > limite]

        if not baseline or not recentes:
            continue

        e1rm_inicial = baseline[-1][1]
        e1rm_atual = recentes[-1][1]

        if e1rm_atual <= e1rm_inicial:
            nome = names.get(exercise_id, "Exercício sem nome")
            alertas.append(
                {
                    "exercise_id": exercise_id,
                    "nome": nome,
                    "e1rm_inicial_kg": round(e1rm_inicial, 2),
                    "e1rm_atual_kg": round(e1rm_atual, 2),
                    "semanas_janela": janela_semanas,
                    "alerta": (
                        f"Estagnação de carga em {nome}: o e1RM permaneceu em "
                        f"{round(e1rm_atual, 2)} kg nas últimas {janela_semanas} semanas. "
                        "Aumente a carga em 2,5-5% ou adicione 1-2 repetições para voltar a progredir."
                    ),
                }
            )

    return alertas
