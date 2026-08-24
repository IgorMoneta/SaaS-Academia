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
        return datetime.fromisoformat(
            text.replace("Z", "+00:00")
        ).date()
    except ValueError:
        try:
            return datetime.strptime(
                text[:10], "%Y-%m-%d"
            ).date()
        except ValueError:
            return None


def _round(value: float | None, digits: int = 2):
    if value is None:
        return None
    return round(value, digits)


def build_fitness_summary(
    *,
    measurements: list[dict],
    load_logs: list[dict],
    exercises: list[dict],
    meta_semanal: int | float | None = None,
    today: date | None = None,
) -> dict:
    """
    Calcula somente indicadores objetivos.

    Não chama a média de dias registrados de "aderência", porque o banco
    atual não possui sessões planejadas/concluídas suficientes para medir
    aderência formal.
    """
    today = today or date.today()
    cutoff_28d = today - timedelta(days=27)

    result = {
        "treino": {
            "registros_total": len(load_logs),
            "dias_ultimos_28_dias": 0,
            "media_dias_semana_28d": 0.0,
            "meta_dias_semana": None,
            "cobertura_meta_pct": None,
            "exercicios": [],
        },
        "medidas": {
            "registros_total": len(measurements),
            "atual": {},
            "variacao": {},
        },
        "observacoes": [],
    }

    # Medidas
    ordered_measurements = sorted(
        measurements,
        key=lambda item: (
            str(item.get("data", "")),
            int(item.get("timestamp") or 0),
        ),
    )

    if ordered_measurements:
        first = ordered_measurements[0]
        latest = ordered_measurements[-1]

        result["medidas"]["atual"] = {
            key: latest.get(key)
            for key in (
                "data",
                "peso",
                "altura",
                "objetivo",
                "frequencia",
                "peito",
                "cintura",
                "braco",
                "coxa",
                "panturrilha",
            )
            if latest.get(key) not in (None, "")
        }

        target = _float(meta_semanal) or _float(
            latest.get("meta_semanal")
        ) or _float(latest.get("frequencia"))
        if target:
            result["treino"]["meta_dias_semana"] = int(target)

        for key in (
            "peso",
            "peito",
            "cintura",
            "braco",
            "coxa",
            "panturrilha",
        ):
            old = _float(first.get(key))
            new = _float(latest.get(key))
            if old is not None and new is not None:
                result["medidas"]["variacao"][key] = _round(
                    new - old
                )

    # Frequência registrada
    if result["treino"]["meta_dias_semana"] is None:
        target = _float(meta_semanal)
        if target:
            result["treino"]["meta_dias_semana"] = int(target)

    dates_28d = {
        parsed
        for item in load_logs
        if (parsed := _date(item.get("data")))
        and cutoff_28d <= parsed <= today
    }

    days_28d = len(dates_28d)
    weekly_average = days_28d / 4

    result["treino"]["dias_ultimos_28_dias"] = days_28d
    result["treino"]["media_dias_semana_28d"] = round(
        weekly_average, 2
    )

    target = result["treino"]["meta_dias_semana"]
    if target:
        coverage = min(100, (weekly_average / target) * 100)
        result["treino"]["cobertura_meta_pct"] = round(
            coverage
        )

    # Progressão por exercício
    names = {
        str(item.get("id")): item.get(
            "nome", "Exercício sem nome"
        )
        for item in exercises
    }

    grouped: dict[str, list[dict]] = defaultdict(list)
    for log in load_logs:
        grouped[str(log.get("exercise_id"))].append(log)

    exercise_rows = []

    for exercise_id, rows in grouped.items():
        ordered = sorted(
            rows,
            key=lambda item: (
                str(item.get("data", "")),
                int(item.get("timestamp") or 0),
            ),
        )

        valid = [
            item
            for item in ordered
            if _float(item.get("peso_kg")) is not None
            and _float(item.get("reps")) is not None
        ]

        if not valid:
            continue

        first = valid[0]
        latest = valid[-1]

        first_weight = float(first["peso_kg"])
        latest_weight = float(latest["peso_kg"])
        first_reps = float(first["reps"])
        latest_reps = float(latest["reps"])

        # Estimativa simples de 1RM (Epley), usada apenas como indicador
        # comparativo dentro do próprio exercício.
        first_e1rm = first_weight * (1 + first_reps / 30)
        latest_e1rm = latest_weight * (1 + latest_reps / 30)

        exercise_rows.append(
            {
                "nome": names.get(
                    exercise_id, "Exercício sem nome"
                ),
                "registros": len(valid),
                "primeira_carga_kg": first_weight,
                "ultima_carga_kg": latest_weight,
                "variacao_carga_kg": _round(
                    latest_weight - first_weight
                ),
                "primeiras_reps": int(first_reps),
                "ultimas_reps": int(latest_reps),
                "e1rm_inicial_kg": _round(first_e1rm),
                "e1rm_atual_kg": _round(latest_e1rm),
                "variacao_e1rm_pct": _round(
                    ((latest_e1rm - first_e1rm) / first_e1rm)
                    * 100
                    if first_e1rm > 0
                    else None
                ),
                "ultimo_registro": latest.get("data"),
            }
        )

    exercise_rows.sort(
        key=lambda item: (
            item["variacao_e1rm_pct"]
            if item["variacao_e1rm_pct"] is not None
            else -999
        ),
        reverse=True,
    )

    result["treino"]["exercicios"] = exercise_rows

    # Observações determinísticas curtas
    if target and result["treino"]["cobertura_meta_pct"] is not None:
        coverage = result["treino"]["cobertura_meta_pct"]
        if coverage >= 90:
            result["observacoes"].append(
                "Frequência registrada próxima da meta semanal."
            )
        elif coverage >= 60:
            result["observacoes"].append(
                "Frequência registrada abaixo da meta semanal."
            )
        else:
            result["observacoes"].append(
                "Frequência registrada bem abaixo da meta semanal."
            )

    if exercise_rows:
        best = exercise_rows[0]
        if (
            best["variacao_e1rm_pct"] is not None
            and best["variacao_e1rm_pct"] > 0
        ):
            result["observacoes"].append(
                f"Maior progressão estimada: {best['nome']} "
                f"({best['variacao_e1rm_pct']:+.1f}% no e1RM)."
            )

    weight_delta = result["medidas"]["variacao"].get("peso")
    if weight_delta is not None:
        result["observacoes"].append(
            f"Peso: {weight_delta:+.1f} kg desde o primeiro registro."
        )

    return result
