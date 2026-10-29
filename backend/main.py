import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes import agent, analytics, generator, state


load_dotenv()

app = FastAPI(
    title="FitSaaS API",
    version="2.0.0",
    description="Analytics de treino + integração com Hermes Agent.",
)

# Origens permitidas para chamadas cross-origin do frontend.
# Sobrescreva com a variável CORS_ORIGINS (lista separada por vírgula).
CORS_ORIGINS = [
    o.strip()
    for o in os.getenv(
        "CORS_ORIGINS",
        (
            "http://localhost:5173,http://localhost:5174,"
            "http://127.0.0.1:5173,http://127.0.0.1:5174,"
            "https://fitsaas-frontend.onrender.com"
        ),
    ).split(",")
    if o.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_origin_regex=os.getenv(
        "CORS_ORIGIN_REGEX",
        r"https://fitsaas-frontend.*\.onrender\.com",
    ),
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analytics.router, prefix="/api")
app.include_router(agent.router, prefix="/api")
app.include_router(state.router, prefix="/api")
app.include_router(generator.router, prefix="/api")


@app.get("/")
def health():
    return {
        "status": "ok",
        "service": "FitSaaS API",
        "version": "2.0.0",
    }
