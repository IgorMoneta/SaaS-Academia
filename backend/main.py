"""
FitSaaS — Backend FastAPI

Como rodar:
    cd backend
    pip install -r requirements.txt
    uvicorn main:app --reload --port 8000

Variáveis de ambiente (.env):
    ANTHROPIC_API_KEY=sk-ant-...   (obrigatório para o chatbot)
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from routes import predict, chat

load_dotenv()

app = FastAPI(title="FitSaaS API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(predict.router, prefix="/api")
app.include_router(chat.router,    prefix="/api")


@app.get("/")
def health():
    return {"status": "ok", "service": "FitSaaS API"}
