from fastapi import APIRouter
from pydantic import BaseModel, Field

from services.exercise_library import EXERCISE_LIBRARY
from services.progression import detect_stalls
from services.workout_generator import generate_workout_plan


router = APIRouter()


class GerarTreinoInput(BaseModel):
    dias_semana: int = Field(ge=2, le=6, description="Dias de treino por semana")
    objetivo: str | None = None
    peso: float | None = None
    altura: float | None = None  # em centímetros
    idade: int | None = None


class ProgressaoInput(BaseModel):
    load_logs: list[dict] = []
    exercises: list[dict] = []


@router.post("/gerar-treino")
def gerar_treino(body: GerarTreinoInput):
    return generate_workout_plan(
        dias_semana=body.dias_semana,
        objetivo=body.objetivo,
        peso=body.peso,
        altura=body.altura,
        idade=body.idade,
    )


@router.get("/exercicios")
def listar_exercicios():
    return {"biblioteca": EXERCISE_LIBRARY}


@router.post("/progressao")
def progressao(body: ProgressaoInput):
    return {"alertas": detect_stalls(body.load_logs, body.exercises)}
