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


def generate_fallback_insight(analytics: dict, message: str) -> str:
    treino = analytics.get("treino", {})
    medidas = analytics.get("medidas", {})
    obs = analytics.get("observacoes", [])
    exercicios = treino.get("exercicios", [])
    atual = medidas.get("atual", {})
    variacao = medidas.get("variacao", {})

    lines = [
        "*(Modo de Contingência — Resumo Analítico sem IA)*\n",
        "O serviço de IA externa está indisponível ou sem chave configurada, mas aqui estão seus indicadores analíticos processados pelo FitSaaS:\n",
    ]

    # Frequência
    dias_28d = treino.get("dias_ultimos_28_dias", 0)
    media_sem = treino.get("media_dias_semana_28d", 0.0)
    meta = treino.get("meta_dias_semana")
    cobertura = treino.get("cobertura_meta_pct")

    if meta:
        lines.append(
            f"📊 **Frequência de Treino:** {dias_28d} dias nos últimos 28d "
            f"(Média: **{media_sem} dias/sem** | Meta: {meta} dias/sem | Cobertura: **{cobertura}%**)."
        )
    else:
        lines.append(
            f"📊 **Frequência de Treino:** {dias_28d} dias nos últimos 28d "
            f"(Média: **{media_sem} dias/sem**)."
        )

    # Cargas e Progressão
    if exercicios:
        melhor = exercicios[0]
        nome = melhor.get("nome", "Exercício")
        pct = melhor.get("variacao_e1rm_pct")
        c_ini = melhor.get("primeira_carga_kg")
        c_fim = melhor.get("ultima_carga_kg")
        if pct is not None:
            lines.append(
                f"💪 **Maior Evolução no e1RM:** {nome} "
                f"({c_ini}kg ➔ {c_fim}kg | **{pct:+.1f}%** de força estimada)."
            )
        lines.append(f"🏋️ **Exercícios Monitorados:** {len(exercicios)} exercício(s) com carga.")
    else:
        lines.append("🏋️ **Cargas:** Nenhum registro de exercício encontrado ainda.")

    # Medidas
    peso_atual = atual.get("peso")
    var_peso = variacao.get("peso")
    if peso_atual is not None:
        delta_str = f" ({var_peso:+.1f}kg desde o início)" if var_peso is not None else ""
        lines.append(f"📏 **Peso Atual:** {peso_atual} kg{delta_str}.")

    # Observações do motor determinístico
    if obs:
        lines.append("\n📌 **Insights do Sistema:**")
        for item in obs:
            lines.append(f"- {item}")

    lines.append(
        "\n*Dica: Para habilitar respostas conversacionais completas por IA, insira uma chave gratuita da Groq, OpenRouter ou configure o Ollama local em `backend/.env`.*"
    )

    return "\n".join(lines)


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
    except (httpx.HTTPStatusError, httpx.RequestError, RuntimeError, Exception):
        # Fallback local determinístico em caso de falha do Hermes ou falta de token/chave
        answer = generate_fallback_insight(analytics, body.message)

    return {
        "resposta": answer,
        "analytics": analytics,
    }

