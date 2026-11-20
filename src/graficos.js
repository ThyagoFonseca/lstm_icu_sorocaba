const INDICE = "Humidex|ITU|IDT|TEv|TW";

export const ESTACOES_MENU = [
  { id: "ufscar", nome: "UFSCar" },
  { id: "sorocaba", nome: "Sorocaba" },
  { id: "sao_miguel_arcanjo", nome: "São Miguel Arcanjo" },
  { id: "sao_paulo_interlagos", nome: "Interlagos" },
  { id: "sao_paulo_mirante_de_santana", nome: "Mirante de Santana" },
  { id: "barueri", nome: "Barueri" },
  { id: "anteriores", nome: "Figuras anteriores" },
];

export function classificar(arquivo) {
  const figura = arquivo.match(/^previsao_humidex_(\d{14})\.png$/);
  if (figura) {
    return {
      arquivo,
      estacao: "anteriores",
      indice: "Humidex",
      tipo: "figura",
      janela: null,
      horizonte: null,
      quando: figura[1],
    };
  }
  const serie = arquivo.match(new RegExp(`^(\\d{14})_(.+)_(${INDICE})_serie_diaria\\.html$`));
  if (serie) {
    return {
      arquivo,
      quando: serie[1],
      estacao: serie[2].toLowerCase(),
      indice: serie[3],
      tipo: "serie",
      janela: null,
      horizonte: null,
    };
  }
  const dispersao = arquivo.match(new RegExp(`^(\\d{14})_(.+)_(${INDICE})_diaria_janela(\\d+)_horizonte(\\d+)\\.html$`));
  if (dispersao) {
    return {
      arquivo,
      quando: dispersao[1],
      estacao: dispersao[2].toLowerCase(),
      indice: dispersao[3],
      tipo: "dispersao",
      janela: Number(dispersao[4]),
      horizonte: Number(dispersao[5]),
    };
  }
  return null;
}

export function quandoLegivel(quando) {
  if (!quando || quando.length < 12) return quando;
  const dia = quando.slice(6, 8);
  const mes = quando.slice(4, 6);
  const ano = quando.slice(0, 4);
  const hora = quando.slice(8, 10);
  const minuto = quando.slice(10, 12);
  return `${dia}/${mes}/${ano} ${hora}:${minuto}`;
}

export function lerRotaGrafico() {
  const partes = window.location.hash.replace(/^#/, "").split("/").filter(Boolean);
  const tipo = partes[3] === "dispersao" || partes[3] === "figura" ? partes[3] : "serie";
  return {
    estacao: partes[1] || "ufscar",
    indice: partes[2] || "Humidex",
    tipo,
    janela: Number(partes[4]) || 14,
  };
}

export function enderecoGrafico(rota) {
  const janela = rota.tipo === "dispersao" ? `/${rota.janela}` : "";
  return `#/graficos/${rota.estacao}/${rota.indice}/${rota.tipo}${janela}`;
}
