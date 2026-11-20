import csvTexto from "../../knowledge/model_results/model_results.csv?raw";
import mapaMape from "./mape.json";

const COLUNAS_TEXTO = new Set(["datetime", "alvo", "estacao", "modelo"]);
const FATORES = ["janela", "unidades", "epochs", "batch_size", "seed"];

const NOMES = {
  ufscar: "UFSCar",
  ufscar_sem_limpeza: "UFSCar sem limpeza",
  sao_miguel_arcanjo: "São Miguel Arcanjo",
  sao_paulo_interlagos: "Interlagos",
  sao_paulo_mirante_de_santana: "Mirante de Santana",
  barueri: "Barueri",
  sorocaba: "Sorocaba",
};

const ROTULOS = {
  janela: "Janela (dias)",
  unidades: "Unidades da LSTM",
  epochs: "Épocas",
  batch_size: "Lote",
  seed: "Semente",
};

const PROXIMAS = [
  {
    janela: 14,
    unidades: 50,
    epochs: 500,
    batch_size: 16,
    seed: 7,
    horizonte: 1,
    proporcao_treino: 0.8,
    comparavel: true,
    porque: "O lote ainda não entra na busca. Com 16, o peso é corrigido mais vezes nas mesmas 500 épocas.",
  },
  {
    janela: 14,
    unidades: 50,
    epochs: 500,
    batch_size: 64,
    seed: 7,
    horizonte: 1,
    proporcao_treino: 0.8,
    comparavel: true,
    porque: "O outro extremo do lote. O registro só tem o valor 32.",
  },
  {
    janela: 14,
    unidades: 100,
    epochs: 500,
    batch_size: 32,
    seed: 7,
    horizonte: 1,
    proporcao_treino: 0.8,
    comparavel: true,
    porque: "Cem unidades só foi testada com janela 21, onde o erro piorou. Falta a mesma largura na janela 14.",
  },
  {
    janela: 14,
    unidades: 24,
    epochs: 200,
    batch_size: 32,
    seed: 7,
    horizonte: 1,
    proporcao_treino: 0.8,
    comparavel: true,
    porque: "A rede de 24 unidades só treinou por 500 épocas. Duzentas épocas só existem na rede de 50.",
  },
  {
    janela: 14,
    unidades: 50,
    epochs: 500,
    batch_size: 32,
    seed: 123,
    horizonte: 1,
    proporcao_treino: 0.8,
    comparavel: true,
    porque: "A configuração escolhida só foi repetida nas sementes 7 e 42.",
  },
  {
    janela: 14,
    unidades: 50,
    epochs: 500,
    batch_size: 32,
    seed: 7,
    horizonte: 7,
    proporcao_treino: 0.8,
    comparavel: false,
    porque: "Prevê o sétimo dia, não o dia seguinte. O MAE fica de fora do ranking do horizonte 1.",
  },
  {
    janela: 14,
    unidades: 50,
    epochs: 500,
    batch_size: 32,
    seed: 7,
    horizonte: 1,
    proporcao_treino: 0.7,
    comparavel: false,
    porque: "Muda o corte e o conjunto de teste. Não se compara com o MAE do corte de 80%.",
  },
];

export function nomeEstacao(codigo) {
  return NOMES[codigo] ?? codigo;
}

export function rotuloFator(fator) {
  return ROTULOS[fator];
}

export function numero(valor, casas = 2) {
  return Number(valor).toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
}

export function rotuloRodada(rodada) {
  const lote = rodada.batch_size == null ? "sem lote" : `lote ${rodada.batch_size}`;
  const unidades = rodada.unidades == null ? rodada.modelo.toUpperCase() : `${rodada.unidades} un`;
  const epocas = rodada.epochs == null ? "" : ` · ${rodada.epochs} ep`;
  const semente = rodada.seed == null ? "" : ` · s${rodada.seed}`;
  return `j${rodada.janela} · ${unidades}${epocas} · ${lote}${semente}`;
}

function lerCsv(texto) {
  const linhas = texto.trim().split(/\r?\n/);
  const colunas = linhas[0].split(",");
  return linhas.slice(1).filter(Boolean).map((linha) => {
    const partes = linha.split(",");
    const registro = {};
    colunas.forEach((coluna, indice) => {
      const valor = partes[indice] ?? "";
      if (valor === "") registro[coluna] = null;
      else if (COLUNAS_TEXTO.has(coluna)) registro[coluna] = valor;
      else registro[coluna] = Number(valor);
    });
    return registro;
  });
}

function chave(rodada) {
  return [
    rodada.alvo,
    rodada.estacao,
    rodada.modelo,
    rodada.janela,
    rodada.unidades,
    rodada.epochs,
    rodada.batch_size,
    rodada.seed,
    rodada.horizonte,
    rodada.proporcao_treino,
  ].join("|");
}

function configurarChave(cfg) {
  return ["Humidex", "ufscar", "lstm", cfg.janela, cfg.unidades, cfg.epochs, cfg.batch_size, cfg.seed, cfg.horizonte, cfg.proporcao_treino].join("|");
}

export function buscarMape(estacao, indice, mae) {
  return mapaMape.find(
    (item) => item.estacao === estacao && item.indice === indice && Math.abs(item.mae - mae) < 0.001,
  );
}

export function carregar() {
  const brutas = lerCsv(csvTexto);
  const grupos = new Map();
  for (const rodada of brutas) {
    const id = chave(rodada);
    if (!grupos.has(id)) grupos.set(id, []);
    grupos.get(id).push(rodada);
  }
  const unicas = [...grupos.values()].map((grupo) => ({
    ...grupo[0],
    repeticoes: grupo.length,
  }));
  return { brutas, unicas };
}

export function opcoes(unicas) {
  return {
    alvos: [...new Set(unicas.map((r) => r.alvo))],
    estacoes: [...new Set(unicas.map((r) => r.estacao))],
  };
}

export function ranquear(unicas, alvo, estacao) {
  return unicas
    .filter(
      (r) =>
        r.alvo === alvo &&
        r.estacao === estacao &&
        r.modelo === "lstm" &&
        r.horizonte === 1 &&
        r.proporcao_treino === 0.8 &&
        r.mae != null,
    )
    .sort((a, b) => a.mae - b.mae || a.rmse - b.rmse || Math.abs(a.vies) - Math.abs(b.vies));
}

export function fatia(rodadas, fator) {
  const outros = FATORES.filter((nome) => nome !== fator);
  const grupos = new Map();
  for (const rodada of rodadas) {
    const id = outros.map((nome) => rodada[nome]).join("|");
    if (!grupos.has(id)) grupos.set(id, []);
    grupos.get(id).push(rodada);
  }
  let escolhida = [];
  for (const grupo of grupos.values()) {
    const valores = new Set(grupo.map((rodada) => rodada[fator]));
    const atual = new Set(escolhida.map((rodada) => rodada[fator]));
    if (valores.size < 2) continue;
    if (valores.size > atual.size) escolhida = grupo;
  }
  return [...escolhida].sort((a, b) => a[fator] - b[fator]);
}

export function legendaFatia(grupo, fator) {
  if (!grupo.length) return "";
  const amostra = grupo[0];
  const partes = FATORES.filter((nome) => nome !== fator).map((nome) => {
    if (nome === "janela") return `janela ${amostra.janela}`;
    if (nome === "unidades") return `${amostra.unidades} unidades`;
    if (nome === "epochs") return `${amostra.epochs} épocas`;
    if (nome === "batch_size") return `lote ${amostra.batch_size}`;
    return `semente ${amostra.seed}`;
  });
  return partes.join(" · ");
}

export function mesmaConfiguracao(unicas, referencia, alvo) {
  if (!referencia) return [];
  return unicas
    .filter(
      (r) =>
        r.alvo === alvo &&
        r.modelo === "lstm" &&
        !String(r.estacao).includes("sem_limpeza") &&
        FATORES.every((fator) => r[fator] === referencia[fator]) &&
        r.horizonte === referencia.horizonte &&
        r.proporcao_treino === referencia.proporcao_treino,
    )
    .sort((a, b) => a.mae - b.mae);
}

export function controles(unicas, alvo, estacao) {
  return unicas.filter((r) => {
    if (r.alvo !== alvo || r.horizonte !== 1) return false;
    if (r.modelo === "svr" && r.estacao === estacao) return true;
    return r.estacao === `${estacao}_sem_limpeza`;
  });
}

export function pendentes(unicas) {
  const existentes = new Set(unicas.map(chave));
  return PROXIMAS.filter((cfg) => !existentes.has(configurarChave(cfg)));
}

export function outrosTestes(unicas, alvo) {
  return unicas
    .filter(
      (r) =>
        r.alvo === alvo &&
        r.modelo === "lstm" &&
        r.mae != null &&
        (r.horizonte !== 1 || r.proporcao_treino !== 0.8),
    )
    .sort(
      (a, b) =>
        nomeEstacao(a.estacao).localeCompare(nomeEstacao(b.estacao), "pt-BR") ||
        a.horizonte - b.horizonte ||
        a.proporcao_treino - b.proporcao_treino,
    );
}
