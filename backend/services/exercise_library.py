from __future__ import annotations

# Biblioteca de exercícios agrupada por grupo muscular.
# Dados estáticos, determinísticos: o gerador seleciona a partir daqui.
EXERCISE_LIBRARY: dict[str, list[dict[str, str]]] = {
    "peito": [
        {"nome": "Supino reto com barra", "equipamento": "barra"},
        {"nome": "Supino inclinado com halteres", "equipamento": "halteres"},
        {"nome": "Crucifixo reto", "equipamento": "halteres"},
        {"nome": "Flexão de braço", "equipamento": "peso corporal"},
        {"nome": "Supino máquina", "equipamento": "máquina"},
    ],
    "costas": [
        {"nome": "Puxada frontal", "equipamento": "máquina"},
        {"nome": "Remada curvada", "equipamento": "barra"},
        {"nome": "Remada baixa sentado", "equipamento": "máquina"},
        {"nome": "Barra fixa (ou puxada assistida)", "equipamento": "peso corporal"},
        {"nome": "Remada unilateral com halter", "equipamento": "halteres"},
    ],
    "pernas": [
        {"nome": "Agachamento livre", "equipamento": "barra"},
        {"nome": "Leg press", "equipamento": "máquina"},
        {"nome": "Cadeira extensora", "equipamento": "máquina"},
        {"nome": "Mesa flexora", "equipamento": "máquina"},
        {"nome": "Afundo com halteres", "equipamento": "halteres"},
        {"nome": "Elevação de panturrilha", "equipamento": "máquina"},
    ],
    "ombros": [
        {"nome": "Desenvolvimento com halteres", "equipamento": "halteres"},
        {"nome": "Desenvolvimento militar", "equipamento": "barra"},
        {"nome": "Elevação lateral", "equipamento": "halteres"},
        {"nome": "Elevação frontal", "equipamento": "halteres"},
    ],
    "biceps": [
        {"nome": "Rosca direta", "equipamento": "barra"},
        {"nome": "Rosca alternada", "equipamento": "halteres"},
        {"nome": "Rosca martelo", "equipamento": "halteres"},
    ],
    "triceps": [
        {"nome": "Tríceps na corda", "equipamento": "cabo"},
        {"nome": "Tríceps testa", "equipamento": "barra"},
        {"nome": "Mergulho no banco", "equipamento": "peso corporal"},
    ],
    "abdomen": [
        {"nome": "Prancha", "equipamento": "peso corporal"},
        {"nome": "Abdominal supra", "equipamento": "peso corporal"},
        {"nome": "Elevação de pernas", "equipamento": "peso corporal"},
    ],
}
