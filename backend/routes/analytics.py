from fastapi import APIRouter
from pydantic import BaseModel

from services.fitness_analytics import build_fitness_summary


router = APIRouter()


class FitnessData(BaseModel):
    user_id: str | None = None
    meta_semanal: int | None = None
    measurements: list[dict] = []
    load_logs: list[dict] = []
    exercises: list[dict] = []


@router.post("/analytics")
def analytics_endpoint(body: FitnessData):
    return build_fitness_summary(
        measurements=body.measurements,
        load_logs=body.load_logs,
        exercises=body.exercises,
        meta_semanal=body.meta_semanal,
    )
