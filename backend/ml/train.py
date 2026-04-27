"""
Script de treinamento do modelo ML.

Uso:
    python backend/ml/train.py --dataset caminho/para/dataset.csv

O dataset deve ter colunas:
    peso, altura, idade, sexo (M/F), peito, cintura, quadril,
    braco, antebraco, coxa, panturrilha, gordura,
    grupo_prioritario (label — coluna alvo)

Após o treinamento, salva model.pkl nesta pasta.
O endpoint /api/predict passa a usar o modelo automaticamente.
"""

import argparse
import pandas as pd
import numpy as np
import joblib
from pathlib import Path
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.model_selection import cross_val_score, train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import classification_report

MODEL_PATH = Path(__file__).parent / "model.pkl"

FEATURES = [
    "peso", "altura", "idade", "sexo_num",
    "peito", "cintura", "quadril",
    "braco", "antebraco", "coxa", "panturrilha", "gordura",
]

LABEL = "grupo_prioritario"


def load_and_prepare(path: str) -> tuple:
    df = pd.read_csv(path)

    # Codifica sexo
    df["sexo_num"] = (df["sexo"].str.upper() == "M").astype(int)

    # Preenche nulos com mediana
    for col in FEATURES:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")
            df[col] = df[col].fillna(df[col].median())

    X = df[FEATURES].values
    y = df[LABEL].values
    return X, y


def train(dataset_path: str):
    print(f"Carregando dataset: {dataset_path}")
    X, y = load_and_prepare(dataset_path)

    print(f"Amostras: {len(X)} | Classes: {np.unique(y)}")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # Candidatos
    modelos = {
        "RandomForest":       RandomForestClassifier(n_estimators=200, random_state=42),
        "GradientBoosting":   GradientBoostingClassifier(n_estimators=200, random_state=42),
    }

    melhor_score = 0
    melhor_modelo = None
    melhor_nome = ""

    for nome, modelo in modelos.items():
        scores = cross_val_score(modelo, X_train, y_train, cv=5, scoring="f1_weighted")
        print(f"{nome}: F1 médio = {scores.mean():.3f} ± {scores.std():.3f}")
        if scores.mean() > melhor_score:
            melhor_score = scores.mean()
            melhor_modelo = modelo
            melhor_nome = nome

    print(f"\nTreinando modelo final: {melhor_nome}")
    melhor_modelo.fit(X_train, y_train)

    y_pred = melhor_modelo.predict(X_test)
    print("\nRelatório de classificação (test set):")
    print(classification_report(y_test, y_pred))

    joblib.dump(melhor_modelo, MODEL_PATH)
    print(f"\nModelo salvo em: {MODEL_PATH}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", required=True, help="Caminho para o CSV de treinamento")
    args = parser.parse_args()
    train(args.dataset)
