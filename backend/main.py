from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes import agent, analytics, state


load_dotenv()

app = FastAPI(
    title="FitSaaS API",
    version="2.0.0",
    description="Analytics de treino + integração com Hermes Agent.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analytics.router, prefix="/api")
app.include_router(agent.router, prefix="/api")
app.include_router(state.router, prefix="/api")


@app.get("/")
def health():
    return {
        "status": "ok",
        "service": "FitSaaS API",
        "version": "2.0.0",
    }
