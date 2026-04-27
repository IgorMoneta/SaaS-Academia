import os
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
import anthropic

router = APIRouter()

SYSTEM_PROMPT = """Você é um assistente de nutrição esportiva especializado em musculação.
Responda apenas perguntas relacionadas a alimentação, nutrição esportiva e dieta para praticantes de musculação.
Seja direto, prático e use linguagem acessível.
Sempre inclua ao final de cada resposta o aviso:
"⚠️ Esta orientação é genérica e informativa. Consulte um nutricionista habilitado antes de fazer alterações significativas na sua alimentação."
Não prescreva dietas para condições médicas. Não indique doses específicas de medicamentos."""


class ChatInput(BaseModel):
    message: str
    historico: Optional[list] = []
    contexto: Optional[dict] = None   # medidas do aluno para personalizar


@router.post("/chat")
async def chat_endpoint(body: ChatInput):
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        return {"resposta": "Chatbot indisponível: ANTHROPIC_API_KEY não configurada.", "erro": True}

    client = anthropic.Anthropic(api_key=api_key)

    # Injeta contexto do aluno no system prompt
    system = SYSTEM_PROMPT
    if body.contexto:
        ctx = body.contexto
        system += f"\n\nPerfil do aluno: peso={ctx.get('peso')}kg, altura={ctx.get('altura')}cm, objetivo={ctx.get('objetivo')}."

    # Monta histórico de mensagens
    messages = []
    for h in (body.historico or []):
        messages.append({"role": h["role"], "content": h["content"]})
    messages.append({"role": "user", "content": body.message})

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        system=system,
        messages=messages,
    )

    return {"resposta": response.content[0].text, "erro": False}
