from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel

from services.app_database import load_app_state, save_app_state


router = APIRouter()


class AppStateInput(BaseModel):
    state: dict[str, Any]


@router.get("/state")
def get_state():
    return {
        "state": load_app_state(),
    }


@router.put("/state")
def put_state(body: AppStateInput):
    return save_app_state(body.state)
