"""Humidex diário de Sorocaba, nas mesmas variações já medidas na UFSCar.
Não grava o arquivo .keras. Grava a série e a dispersão em graficos_lstm.
"""

import os
import sys
from datetime import datetime
from pathlib import Path

os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"

RAIZ = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(RAIZ / "Programas" / "main"))

import numpy as np
from keras.layers import Dense, Input, LSTM
from keras.models import Sequential
from keras.utils import set_random_seed

from functions.preparar import preparar_base
from graphics.graphics import plot_dispersao, plot_serie_diaria
from lstm.preprocessing import scale_minmax, split_sequence

ARQUIVO = RAIZ / "knowledge" / "model_results" / "model_results.csv"
ALVO = "Humidex"
SOROCABA = {
    "nome": "sorocaba",
    "arquivo": "sorocaba/ciiagro_sorocaba_2025.csv",
    "leitura": "ciiagro",
}
BASE = {"horizonte": 1, "proporcao_treino": 0.8, "epochs": 500, "batch_size": 32, "unidades": 50, "seed": 7, "janela": 14}
RODADAS = [
    (SOROCABA, dict(BASE)),
    (SOROCABA, {**BASE, "janela": 7}),
    (SOROCABA, {**BASE, "janela": 21}),
    (SOROCABA, {**BASE, "unidades": 24}),
    (SOROCABA, {**BASE, "unidades": 100}),
    (SOROCABA, {**BASE, "epochs": 200}),
    (SOROCABA, {**BASE, "batch_size": 16}),
    (SOROCABA, {**BASE, "batch_size": 64}),
    (SOROCABA, {**BASE, "seed": 42}),
    (SOROCABA, {**BASE, "seed": 123}),
]


def chave(estacao, cfg):
    return (
        ALVO,
        estacao,
        "lstm",
        cfg["janela"],
        cfg["unidades"],
        cfg["epochs"],
        cfg["batch_size"],
        cfg["seed"],
        cfg["horizonte"],
        cfg["proporcao_treino"],
    )


def ja_registrada(estacao, cfg):
    if not ARQUIVO.exists():
        return False
    alvo = chave(estacao, cfg)
    for linha in ARQUIVO.read_text(encoding="utf-8").splitlines()[1:]:
        partes = linha.split(",")
        if len(partes) < 16:
            continue
        lida = (
            partes[1],
            partes[2],
            partes[15],
            int(float(partes[11])),
            int(float(partes[13])) if partes[13] else None,
            int(float(partes[9])) if partes[9] else None,
            int(float(partes[8])) if partes[8] else None,
            int(float(partes[14])) if partes[14] else None,
            int(float(partes[10])),
            float(partes[12]),
        )
        if lida == alvo:
            return True
    return False


def treinar(serie, cfg):
    set_random_seed(cfg["seed"])
    X, y = split_sequence(serie, cfg["janela"], cfg["horizonte"])
    corte = int(len(X) * cfg["proporcao_treino"])
    X_treino, y_treino, X_teste, baixo, alto = scale_minmax(X[:corte], y[:corte], X[corte:])
    modelo = Sequential()
    modelo.add(Input(shape=(X_treino.shape[1], X_treino.shape[2])))
    modelo.add(LSTM(cfg["unidades"], activation="relu"))
    modelo.add(Dense(1))
    modelo.compile(optimizer="adam", loss="mse")
    modelo.fit(X_treino, y_treino, epochs=cfg["epochs"], batch_size=cfg["batch_size"], verbose=0)
    previsto = modelo.predict(X_teste, verbose=0).reshape(-1) * (alto - baixo) + baixo
    real = y[corte:]
    inicio = cfg["janela"] + cfg["horizonte"] - 1 + corte
    return real, previsto, inicio


def metricas(real, previsto):
    erro = np.ravel(previsto) - np.ravel(real)
    ss_tot = float(np.sum((real - real.mean()) ** 2))
    return {
        "mae": float(np.mean(np.abs(erro))),
        "rmse": float(np.sqrt(np.mean(erro**2))),
        "r2": 1 - float(np.sum(erro**2)) / ss_tot,
        "vies": float(np.mean(erro)),
    }


def registrar(estacao, cfg, inicio, valores):
    agora = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    linha = ",".join(
        [
            agora,
            ALVO,
            estacao,
            str(inicio),
            str(valores["mae"]),
            str(valores["rmse"]),
            str(valores["r2"]),
            str(valores["vies"]),
            str(cfg["batch_size"]),
            str(cfg["epochs"]),
            str(cfg["horizonte"]),
            str(cfg["janela"]),
            str(cfg["proporcao_treino"]),
            str(cfg["unidades"]),
            str(cfg["seed"]),
            "lstm",
        ]
    )
    with ARQUIVO.open("a", encoding="utf-8") as saida:
        saida.write(linha + "\n")


def main():
    series = {}
    pasta = RAIZ / "graficos_lstm"
    pasta.mkdir(exist_ok=True)
    for estacao, cfg in RODADAS:
        nome = estacao["nome"]
        if nome not in series:
            base = preparar_base(RAIZ, estacao)
            series[nome] = base[ALVO].dropna()
        serie = series[nome]
        existe = ja_registrada(nome, cfg)
        real, previsto, inicio = treinar(serie.to_numpy(dtype=float), cfg)
        valores = metricas(real, previsto)
        if not existe:
            registrar(nome, cfg, inicio, valores)
        plot_serie_diaria(serie, previsto, inicio, pasta, ALVO, nome, mostrar=False)
        plot_dispersao(real, previsto, serie, inicio, pasta, ALVO, cfg["janela"], cfg["horizonte"], nome, mostrar=False)
        print(
            f"{nome} janela {cfg['janela']} un {cfg['unidades']} ep {cfg['epochs']} "
            f"lote {cfg['batch_size']} s {cfg['seed']} horizonte {cfg['horizonte']} "
            f"corte {cfg['proporcao_treino']} MAE {valores['mae']:.4f}"
        )


if __name__ == "__main__":
    main()
