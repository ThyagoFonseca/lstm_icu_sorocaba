import { useEffect, useMemo, useState } from "react";
import { nomeEstacao } from "./analise.js";
import indice from "./dados-graficos/indice.json";
import { Dispersao, SerieDiaria } from "./GraficoNativo.jsx";
import {
  ESTACOES_MENU,
  classificar,
  enderecoGrafico,
  lerRotaGrafico,
  quandoLegivel,
} from "./graficos.js";

const cargas = import.meta.glob("./dados-graficos/*.json");
const figuras = Object.fromEntries(
  Object.entries(
    import.meta.glob("../public/figuras/*.png", { eager: true, import: "default" }),
  ).map(([caminho, url]) => [caminho.split(/[/\\]/).pop(), url]),
);

const INDICES = ["Humidex", "ITU", "IDT", "TEv", "TW"];

function nomeDaEstacao(codigo) {
  if (codigo === "anteriores") return "Figuras anteriores";
  return nomeEstacao(codigo);
}

export default function Graficos() {
  const [rota, setRota] = useState(lerRotaGrafico);
  const [arquivo, setArquivo] = useState("");
  const [dado, setDado] = useState(null);

  useEffect(() => {
    const aoMudar = () => setRota(lerRotaGrafico());
    window.addEventListener("hashchange", aoMudar);
    return () => window.removeEventListener("hashchange", aoMudar);
  }, []);

  const itens = useMemo(
    () =>
      indice
        .map((item) => {
          const meta = classificar(item.arquivo);
          return meta ? { ...meta, id: item.id } : null;
        })
        .filter(Boolean),
    [],
  );
  const daEstacao = itens.filter((item) => item.estacao === rota.estacao);
  const indicesPresentes = INDICES.filter((indice) => daEstacao.some((item) => item.indice === indice));
  const doIndice = daEstacao.filter((item) => item.indice === rota.indice);
  const tipos = [...new Set(doIndice.map((item) => item.tipo))];
  const tipo = tipos.includes(rota.tipo) ? rota.tipo : tipos[0];
  const doTipo = doIndice.filter((item) => item.tipo === tipo);
  const janelas = [...new Set(doTipo.map((item) => item.janela).filter((valor) => valor != null))].sort(
    (a, b) => a - b,
  );
  const janela = janelas.includes(rota.janela) ? rota.janela : janelas[0];
  const grupo = tipo === "dispersao" ? doTipo.filter((item) => item.janela === janela) : doTipo;
  const ordenados = [...grupo].sort((a, b) => b.quando.localeCompare(a.quando));
  const chaveGrupo = ordenados.map((item) => item.arquivo).join("|");

  useEffect(() => {
    setArquivo(ordenados[0]?.arquivo ?? "");
  }, [chaveGrupo]);

  function ir(parcial) {
    const proxima = { ...rota, ...parcial };
    if (proxima.tipo !== "dispersao") proxima.janela = 14;
    const destino = enderecoGrafico(proxima);
    if (window.location.hash !== destino) window.location.hash = destino;
    else setRota(lerRotaGrafico());
  }

  const escolhido = ordenados.find((item) => item.arquivo === arquivo) ?? ordenados[0];
  const figura = rota.estacao === "anteriores";

  useEffect(() => {
    if (!escolhido?.id) {
      setDado(null);
      return undefined;
    }
    let vivo = true;
    setDado(null);
    const carregar = cargas[`./dados-graficos/${escolhido.id}.json`];
    if (!carregar) return undefined;
    carregar().then((modulo) => {
      if (vivo) setDado(modulo.default);
    });
    return () => {
      vivo = false;
    };
  }, [escolhido?.id]);

  return (
    <main className="miolo">
      <header className="topo">
        <div>
          <p className="olho">Gráficos gravados pelo modelo</p>
          <h1>{figura ? "Figuras anteriores" : nomeDaEstacao(rota.estacao)}</h1>
          <p className="subtitulo">
            Os mesmos pontos gravados pelo modelo. A série diária mostra o índice e, no trecho final, a previsão.
            A dispersão compara o valor real com o previsto. Na série, a faixa de baixo aproxima um período.
          </p>
        </div>
      </header>

      <nav className="trilhas" aria-label="Estações">
        {ESTACOES_MENU.map((estacao) => (
          <a
            key={estacao.id}
            href={`#/graficos/${estacao.id}/Humidex/serie`}
            aria-current={rota.estacao === estacao.id ? "page" : undefined}
          >
            {estacao.nome}
          </a>
        ))}
      </nav>

      {!figura && indicesPresentes.length > 0 && (
        <nav className="trilhas" aria-label="Índices">
          {indicesPresentes.map((indice) => (
            <a
              key={indice}
              href={`#/graficos/${rota.estacao}/${indice}/serie`}
              aria-current={rota.indice === indice ? "page" : undefined}
            >
              {indice}
            </a>
          ))}
        </nav>
      )}

      {!figura && tipos.length > 0 && (
        <div className="escolhas">
          {tipos.includes("serie") && (
            <button type="button" aria-pressed={tipo === "serie"} onClick={() => ir({ tipo: "serie" })}>
              Série diária
            </button>
          )}
          {tipos.includes("dispersao") && (
            <button type="button" aria-pressed={tipo === "dispersao"} onClick={() => ir({ tipo: "dispersao", janela })}>
              Dispersão
            </button>
          )}
          {tipo === "dispersao" &&
            janelas.map((valor) => (
              <button
                key={valor}
                type="button"
                aria-pressed={valor === janela}
                onClick={() => ir({ tipo: "dispersao", janela: valor })}
              >
                Janela {valor}
              </button>
            ))}
          {ordenados.length > 1 && (
            <label>
              Gravação
              <select value={escolhido?.arquivo ?? ""} onChange={(evento) => setArquivo(evento.target.value)}>
                {ordenados.map((item) => (
                  <option key={item.arquivo} value={item.arquivo}>
                    {quandoLegivel(item.quando)}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      )}

      {escolhido && escolhido.tipo !== "figura" && (
        <figure className="moldura">
          {dado?.previsao && <SerieDiaria dado={dado} />}
          {dado?.pontos && !dado.previsao && <Dispersao dado={dado} />}
          {!dado && <p className="cartao">Abrindo o gráfico.</p>}
          <figcaption>
            {dado?.titulo || (escolhido.tipo === "serie" ? "Série diária" : "Dispersão")}
            {" · "}
            {quandoLegivel(escolhido.quando)}
          </figcaption>
        </figure>
      )}

      {figura && (
        <div className="figuras">
          {ordenados.map((item) => (
            <figure className="moldura" key={item.arquivo}>
              <img src={figuras[item.arquivo]} alt={`Figura de Humidex de ${quandoLegivel(item.quando)}`} />
              <figcaption>{quandoLegivel(item.quando)}</figcaption>
            </figure>
          ))}
        </div>
      )}

      {!escolhido && <p className="cartao">Não há gráfico desta estação nesta combinação.</p>}
    </main>
  );
}
