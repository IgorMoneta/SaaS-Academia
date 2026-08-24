import json

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from services.fitness_analytics import build_fitness_summary
from services.hermes_client import HermesClient


router = APIRouter()


SYSTEM_PROMPT = """Você é o assistente de insights do FitSaaS.

Você recebe indicadores já calculados pelo backend em Python.
Sua função é interpretar esses indicadores para um praticante de musculação.

Regras:
- Não invente dados.
- Não refaça cálculos que já vieram prontos.
- Diferencie observação de hipótese.
- Cite números concretos quando forem relevantes.
- Chame "cobertura da meta" de cobertura da meta, não de aderência clínica.
- O e1RM é apenas uma estimativa comparativa, não uma medição direta de força máxima.
- Não faça diagnóstico médico.
- Não prescreva medicamentos, hormônios ou dietas clínicas.
- Se o usuário relatar dor, falta de ar ou outro sintoma de saúde, oriente a procurar avaliação profissional em vez de concluir a causa.
- Responda em português do Brasil.
- Prefira uma resposta curta: resumo + até 3 pontos + próximo passo prático.
"""


class HistoryItem(BaseModel):
    role: str
    content: str


class AgentInput(BaseModel):
    user_id: str | None = None
    meta_semanal: int | None = None
    message: str = Field(min_length=1, max_length=2000)
    historico: list[HistoryItem] = []
    measurements: list[dict] = []
    load_logs: list[dict] = []
    exercises: list[dict] = []


@router.post("/agent")
async def agent_endpoint(body: AgentInput):
    analytics = build_fitness_summary(
        measurements=body.measurements,
        load_logs=body.load_logs,
        exercises=body.exercises,
        meta_semanal=body.meta_semanal,
    )

    messages = [
        {
            "role": "system",
            "content": SYSTEM_PROMPT,
        }
    ]

    for item in body.historico[-8:]:
        if item.role in {"user", "assistant"}:
            messages.append(item.model_dump())

    messages.append(
        {
            "role": "user",
            "content": (
                f"Pergunta: {body.message}\n\n"
                "Indicadores do FitSaaS:\n"
                f"{json.dumps(analytics, ensure_ascii=False, indent=2)}"
            ),
        }
    )

    try:
        answer = await HermesClient().chat(
            messages=messages,
            session_key=f"fitsaas:user:{body.user_id or 'local'}",
        )
    except httpx.HTTPStatusError as exc:
        detail = (
            f"Hermes retornou HTTP "
            f"{exc.response.status_code}. "
            "Verifique API_SERVER_KEY e a configuração do modelo."
        )
        raise HTTPException(
            status_code=503,
            detail=detail,
        ) from exc
    except (httpx.RequestError, RuntimeError) as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Hermes indisponível: {exc}",
        ) from exc

    return {
        "resposta": answer,
        "analytics": analytics,
    }
