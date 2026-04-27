from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from ml.predictor import predict

router = APIRouter()

WORKOUT_LIBRARY = {
    "Peitoral e Ombros": [
        {"nome": "Supino Reto com Barra",       "grupo": "Peitoral", "series": 4, "reps": "8-12",  "descanso": "90s"},
        {"nome": "Supino Inclinado com Halter",  "grupo": "Peitoral", "series": 3, "reps": "10-12", "descanso": "75s"},
        {"nome": "Crucifixo com Halteres",       "grupo": "Peitoral", "series": 3, "reps": "12-15", "descanso": "60s"},
        {"nome": "Desenvolvimento Militar",      "grupo": "Ombro",    "series": 4, "reps": "8-10",  "descanso": "90s"},
        {"nome": "Elevação Lateral",             "grupo": "Ombro",    "series": 3, "reps": "12-15", "descanso": "60s"},
    ],
    "Dorsais e Costas": [
        {"nome": "Puxada Frontal Aberta",        "grupo": "Dorsal",   "series": 4, "reps": "8-12",  "descanso": "90s"},
        {"nome": "Remada Curvada com Barra",     "grupo": "Dorsal",   "series": 4, "reps": "8-10",  "descanso": "90s"},
        {"nome": "Remada Unilateral",            "grupo": "Dorsal",   "series": 3, "reps": "10-12", "descanso": "75s"},
        {"nome": "Pullover com Halter",          "grupo": "Dorsal",   "series": 3, "reps": "12-15", "descanso": "60s"},
        {"nome": "Hiperextensão Lombar",         "grupo": "Lombar",   "series": 3, "reps": "15",    "descanso": "60s"},
    ],
    "Bíceps e Tríceps": [
        {"nome": "Rosca Direta com Barra",       "grupo": "Bíceps",   "series": 4, "reps": "10-12", "descanso": "60s"},
        {"nome": "Rosca Martelo",                "grupo": "Bíceps",   "series": 3, "reps": "10-12", "descanso": "60s"},
        {"nome": "Tríceps Testa",                "grupo": "Tríceps",  "series": 4, "reps": "10-12", "descanso": "60s"},
        {"nome": "Tríceps Pulley Corda",         "grupo": "Tríceps",  "series": 3, "reps": "12-15", "descanso": "60s"},
        {"nome": "Mergulho no Banco",            "grupo": "Tríceps",  "series": 3, "reps": "12-15", "descanso": "60s"},
    ],
    "Quadríceps e Posteriores": [
        {"nome": "Agachamento Livre",            "grupo": "Quad",     "series": 4, "reps": "8-12",  "descanso": "120s"},
        {"nome": "Leg Press 45°",               "grupo": "Quad",     "series": 4, "reps": "10-15", "descanso": "90s"},
        {"nome": "Cadeira Extensora",            "grupo": "Quad",     "series": 3, "reps": "12-15", "descanso": "60s"},
        {"nome": "Mesa Flexora",                 "grupo": "Posterior","series": 4, "reps": "10-12", "descanso": "75s"},
        {"nome": "Stiff com Barra",              "grupo": "Posterior","series": 3, "reps": "10-12", "descanso": "90s"},
    ],
    "Panturrilha e Core": [
        {"nome": "Panturrilha em Pé (Smith)",    "grupo": "Panturrilha","series": 5, "reps": "15-20","descanso": "60s"},
        {"nome": "Panturrilha Sentado",          "grupo": "Panturrilha","series": 4, "reps": "15-20","descanso": "60s"},
        {"nome": "Prancha Frontal",              "grupo": "Core",     "series": 4, "reps": "45s",   "descanso": "45s"},
        {"nome": "Abdominal Crunch",             "grupo": "Core",     "series": 3, "reps": "20",    "descanso": "45s"},
        {"nome": "Elevação de Pernas",           "grupo": "Core",     "series": 3, "reps": "15",    "descanso": "45s"},
    ],
}


class MedicaoInput(BaseModel):
    student_id: str
    peso:        Optional[float] = None
    altura:      Optional[float] = None
    idade:       Optional[float] = None
    sexo:        Optional[str]   = "M"
    objetivo:    Optional[str]   = "Hipertrofia"
    frequencia:  Optional[str]   = "3"
    peito:       Optional[float] = None
    cintura:     Optional[float] = None
    quadril:     Optional[float] = None
    braco:       Optional[float] = None
    antebraco:   Optional[float] = None
    coxa:        Optional[float] = None
    panturrilha: Optional[float] = None
    gordura:     Optional[float] = None


@router.post("/predict")
async def predict_endpoint(body: MedicaoInput):
    data = body.model_dump()
    resultado = predict(data)

    grupo = resultado["grupo_prioritario"]
    exercicios = WORKOUT_LIBRARY.get(grupo, [])

    return {
        **resultado,
        "ficha": {
            "grupo_foco": grupo,
            "objetivo": body.objetivo,
            "frequencia": body.frequencia,
            "exercicios": exercicios,
        },
    }
