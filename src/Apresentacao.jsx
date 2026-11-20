import { useCallback, useEffect, useRef, useState } from "react";
import copict from "../Planejamento_slides/copict.png";
import propq from "../Planejamento_slides/propq.png";
import ufscarLogo from "../Planejamento_slides/logo-ufscar-fundo-transparente.png";
import fotoOke from "../Planejamento_slides/t_Oke.png";
import textos from "./apresentacao.json";
import mapaIdw from "./dados-graficos/IDW_v1.png";
import mapaIdwSorocaba from "./dados-graficos/IDW_v2.png";
import serieUfscar from "./dados-graficos/20261021101305_ufscar_Humidex_serie_diaria.json";
import serieCiiagro from "./dados-graficos/20261027170300_sorocaba_Humidex_serie_diaria.json";
import { SerieDiaria } from "./GraficoNativo.jsx";
import { buscarMape, numero, ranquear, carregar } from "./analise.js";

const PROXIMO = new Set(["ArrowRight", "ArrowDown", "PageDown"]);
const ANTERIOR = new Set(["ArrowLeft", "ArrowUp", "PageUp", "Backspace"]);
const ESCALAS = [0.85, 1, 1.15, 1.3, 1.45];

function Logos() {
  return (
    <div className="logos">
      <img src={copict} alt="CoPICT" />
      <img src={propq} alt="ProPq" />
      <img src={ufscarLogo} alt="UFSCar" />
    </div>
  );
}

function Motivo({ tipo }) {
  const comum = { fill: "none", stroke: "#8c2f2f", strokeWidth: 1.4, strokeLinecap: "round" };
  if (tipo === "sol") {
    return (
      <svg className="motivo" viewBox="0 0 120 120" aria-hidden="true">
        <circle cx="60" cy="46" r="14" {...comum} />
        <path d="M60 22v6M60 64v6M36 46h6M78 46h6M43 29l4 4M73 59l4 4M43 63l4-4M73 33l4-4" {...comum} />
        <path d="M18 92c14-16 28-16 42 0s28 16 42 0" {...comum} />
        <path d="M28 100h64" stroke="#c4beb4" strokeWidth="1.4" />
      </svg>
    );
  }
  if (tipo === "cidade") {
    return (
      <svg className="motivo" viewBox="0 0 120 120" aria-hidden="true">
        <path d="M22 96V58h18v38M40 96V40h22v56M62 96V52h20v44M82 96V66h16v30" {...comum} />
        <path d="M16 96h90" stroke="#c4beb4" strokeWidth="1.4" />
      </svg>
    );
  }
  if (tipo === "alvo") {
    return (
      <svg className="motivo" viewBox="0 0 120 120" aria-hidden="true">
        <circle cx="60" cy="60" r="28" {...comum} />
        <circle cx="60" cy="60" r="14" {...comum} />
        <circle cx="60" cy="60" r="3" fill="#8c2f2f" stroke="none" />
      </svg>
    );
  }
  if (tipo === "rede") {
    return (
      <svg className="motivo" viewBox="0 0 120 120" aria-hidden="true">
        <circle cx="30" cy="60" r="5" {...comum} />
        <circle cx="60" cy="36" r="5" {...comum} />
        <circle cx="60" cy="84" r="5" {...comum} />
        <circle cx="92" cy="60" r="5" {...comum} />
        <path d="M35 58l20-18M35 62l20 18M65 40l22 16M65 80l22-16" {...comum} />
      </svg>
    );
  }
  if (tipo === "caminho") {
    return (
      <svg className="motivo" viewBox="0 0 120 120" aria-hidden="true">
        <path d="M24 86c18-28 28-28 40-8s22 20 36-16" {...comum} />
        <path d="M88 52l12 8-14 2" {...comum} />
      </svg>
    );
  }
  return (
    <svg className="motivo" viewBox="0 0 120 120" aria-hidden="true">
      <circle cx="60" cy="60" r="26" {...comum} />
      <path d="M48 62l8 8 16-18" {...comum} />
    </svg>
  );
}

function comOke(texto) {
  const partes = String(texto).split("{{oke}}");
  if (partes.length === 1) return texto;
  return partes.map((parte, indice) => (
    <span key={`${parte}-${indice}`}>
      {parte}
      {indice < partes.length - 1 && (
        <button type="button" className="nome-oke">
          Oke
          <span className="ficha ficha-oke">
            <img src={fotoOke} alt="Timothy R. Oke" />
            <span>{textos.oke}</span>
          </span>
        </button>
      )}
    </span>
  ));
}

function Termo({ nome }) {
  return (
    <span className="termo">
      {nome}
      <span className="ficha" role="tooltip">{textos.glossario[nome]}</span>
    </span>
  );
}

function Trilha({ itens, comTitulo = false }) {
  return (
    <ol className="trilha">
      {itens.map((item) => (
        <li key={`${item.ano}-${item.titulo || item.texto}`}>
          <span className="ano">{item.ano}</span>
          <span className="marco" />
          <p>
            {comTitulo && <strong>{item.titulo}. </strong>}
            {comOke(item.texto)}
          </p>
        </li>
      ))}
    </ol>
  );
}

function distanciaKm(origem, destino) {
  const radiano = (grau) => (grau * Math.PI) / 180;
  const dLat = radiano(destino.lat - origem.lat);
  const dLon = radiano(destino.lon - origem.lon);
  const passo = Math.sin(dLat / 2) ** 2
    + Math.cos(radiano(origem.lat)) * Math.cos(radiano(destino.lat)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(passo));
}

function textoKm(valor) {
  return `${valor.toFixed(1).replace(".", ",")} km`;
}

function ponta(origem, destino, folga) {
  const dx = destino.x - origem.x;
  const dy = destino.y - origem.y;
  const tamanho = Math.hypot(dx, dy) || 1;
  return { x: destino.x - (dx / tamanho) * folga, y: destino.y - (dy / tamanho) * folga };
}

function Grafo({ aberta, aoAbrir }) {
  const { unicas } = carregar();
  const cidade = textos.estacoes.find((item) => item.id === "sorocaba");
  const outras = textos.estacoes.filter((item) => item.id !== "sorocaba");
  const centro = { x: 480, y: 246 };
  const raio = 132;
  const folga = 86;
  const nos = outras.map((item, indice) => {
    const angulo = -Math.PI / 2 + (indice * 2 * Math.PI) / outras.length;
    return {
      ...item,
      x: centro.x + Math.cos(angulo) * raio,
      y: centro.y + Math.sin(angulo) * raio,
      rotuloX: centro.x + Math.cos(angulo) * (raio + folga),
      rotuloY: centro.y + Math.sin(angulo) * (raio + folga),
      km: distanciaKm(cidade, item),
    };
  });
  const estacao = textos.estacoes.find((item) => item.id === aberta);

  return (
    <div className="grafo">
      <svg viewBox="0 0 960 510" role="img" aria-label="Distância em linha reta de Sorocaba até cada estação">
        {nos.map((item) => {
          const saida = ponta(item, centro, 22);
          const chegada = ponta(centro, item, 16);
          return <line key={item.id} className="aresta" x1={saida.x} y1={saida.y} x2={chegada.x} y2={chegada.y} />;
        })}
        <g className={aberta === cidade.id ? "no ativo" : "no"} onClick={() => aoAbrir(cidade.id)}>
          <circle cx={centro.x} cy={centro.y} r="16" fill={cidade.cor} />
          <text className="nome-no" x={centro.x} y={centro.y + 36}>{cidade.nome}</text>
          <text className="destaque-no" x={centro.x} y={centro.y + 52}>{cidade.destaque}</text>
        </g>
        {nos.map((item) => (
          <g key={item.id} className={aberta === item.id ? "no ativo" : "no"} onClick={() => aoAbrir(item.id)}>
            <circle cx={item.x} cy={item.y} r="9" fill={item.cor} />
            <text className="nome-no" x={item.rotuloX} y={item.rotuloY}>{item.nome}</text>
            {item.destaque && <text className="destaque-no" x={item.rotuloX} y={item.rotuloY + 16}>{item.destaque}</text>}
            <text className="km" x={item.rotuloX} y={item.rotuloY + (item.destaque ? 32 : 16)}>{textoKm(item.km)}</text>
          </g>
        ))}
      </svg>
      <aside className={estacao ? "gaveta aberta" : "gaveta"}>
        {estacao && <Painel estacao={estacao} unicas={unicas} aoFechar={() => aoAbrir(null)} />}
      </aside>
    </div>
  );
}

function Painel({ estacao, unicas, aoFechar }) {
  const melhor = ranquear(unicas, "Humidex", estacao.id)[0];
  const mape = melhor ? buscarMape(estacao.id, "Humidex", melhor.mae) : null;
  return (
    <div>
      <button type="button" className="fechar" onClick={aoFechar}>{textos.fechar}</button>
      <p className="olho">{estacao.rotulo}</p>
      <h3>{textos.painelTitulo}</h3>
      {mape && (
        <p className="mape pequeno">
          {numero(mape.mape)}% <span><Termo nome="MAPE" /></span>
        </p>
      )}
      {melhor && (
        <p className="nota">
          <Termo nome="MAE" /> {numero(melhor.mae)} · <Termo nome="RMSE" /> {numero(melhor.rmse)} · R² {numero(melhor.r2)}
          {mape ? <> · <Termo nome="Dia anterior" /> {numero(mape.mapeOntem)}%</> : null}
        </p>
      )}
    </div>
  );
}

function Cartao({ cartao, aberta, aoAbrir }) {
  return (
    <>
      <Logos />
      <div className={cartao.motivo && cartao.tipo !== "obrigado" ? "miolo-carta" : "miolo-carta centro"}>
        <div>
          {cartao.tipo === "obrigado" && <Motivo tipo={cartao.motivo} />}
          {cartao.titulo && <h2>{cartao.titulo}</h2>}
          {cartao.frase && <p className="obrigado">{cartao.frase}</p>}
          {cartao.linhas?.map((linha) => <p key={linha}>{linha}</p>)}
          {cartao.geral && <p>{cartao.geral}</p>}
          {cartao.especificosTitulo && <h2>{cartao.especificosTitulo}</h2>}
          {cartao.especificos && (
            <ul className="lista-fina">
              {cartao.especificos.map((item) => <li key={item}>{item}</li>)}
            </ul>
          )}
          {cartao.itens && <Trilha itens={cartao.itens} comTitulo={cartao.tipo === "metodos"} />}
          {cartao.paragrafos?.map((paragrafo) => <p key={paragrafo}>{paragrafo}</p>)}
          {cartao.nota && cartao.tipo !== "idw" && <p className="nota">{cartao.nota}</p>}
          {cartao.tipo === "grafo" && <Grafo aberta={aberta} aoAbrir={aoAbrir} />}
          {cartao.tipo === "series" && (
            <div className="par-series">
              <figure>
                <figcaption>UFSCar</figcaption>
                <SerieDiaria dado={serieUfscar} altura={320} />
              </figure>
              <figure>
                <figcaption>CIIAGRO</figcaption>
                <SerieDiaria dado={serieCiiagro} altura={320} />
              </figure>
            </div>
          )}
          {cartao.tipo === "idw" && (
            <figure className="mapa-idw">
              <img src={mapaIdw} alt="Mapa IDW do Humidex médio entre Sorocaba e São Paulo" />
              <img src={mapaIdwSorocaba} alt="Mapa IDW do Humidex médio em Sorocaba, com UFSCar, CIIAGRO e FATEC" />
              {cartao.nota && <figcaption className="nota">{cartao.nota}</figcaption>}
            </figure>
          )}
        </div>
        {cartao.motivo && cartao.tipo !== "obrigado" && <Motivo tipo={cartao.motivo} />}
      </div>
    </>
  );
}

export default function Apresentacao() {
  const [indice, setIndice] = useState(0);
  const [saida, setSaida] = useState(null);
  const [sentido, setSentido] = useState("proximo");
  const [animar, setAnimar] = useState(false);
  const [aberta, setAberta] = useState(null);
  const [passoFonte, setPassoFonte] = useState(1);
  const indiceRef = useRef(0);
  const temporizador = useRef(0);
  const cartoes = textos.cartoes;
  const total = cartoes.length;

  const trocar = useCallback((proximo) => {
    const atual = indiceRef.current;
    if (proximo === atual || proximo < 0 || proximo >= total) return;
    setSentido(proximo > atual ? "proximo" : "anterior");
    setSaida(atual);
    setAberta(null);
    setAnimar(true);
    indiceRef.current = proximo;
    setIndice(proximo);
    window.clearTimeout(temporizador.current);
    temporizador.current = window.setTimeout(() => setSaida(null), 820);
  }, [total]);

  useEffect(() => () => window.clearTimeout(temporizador.current), []);

  useEffect(() => {
    const aoTeclar = (evento) => {
      if (evento.target.closest("input, textarea, select")) return;
      if (evento.key === "Escape") {
        setAberta(null);
        return;
      }
      if (PROXIMO.has(evento.key) || (evento.key === " " && evento.target === document.body)) {
        evento.preventDefault();
        trocar(indiceRef.current + 1);
      } else if (ANTERIOR.has(evento.key)) {
        evento.preventDefault();
        trocar(indiceRef.current - 1);
      }
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [trocar]);

  return (
    <main className="apresentacao">
      <div className="palco">
        {saida !== null && (
          <article className={`cartao carta sai ${sentido}`} key={`sai-${saida}`}>
            <div className="escala-carta" style={{ zoom: ESCALAS[passoFonte] }}>
              <Cartao cartao={cartoes[saida]} aberta={null} aoAbrir={() => {}} />
            </div>
          </article>
        )}
        <article className={animar ? `cartao carta entra ${sentido}` : "cartao carta"} key={indice}>
          <div className="escala-carta" style={{ zoom: ESCALAS[passoFonte] }}>
            <Cartao cartao={cartoes[indice]} aberta={aberta} aoAbrir={setAberta} />
          </div>
        </article>
      </div>
      <footer className="comandos">
        <button type="button" onClick={() => trocar(indice - 1)}>{textos.anterior}</button>
        <span>{indice + 1} / {total}</span>
        <div className="pontos">
          {cartoes.map((cartao, posicao) => (
            <button
              key={cartao.tipo}
              type="button"
              aria-label={`Slide ${posicao + 1}`}
              aria-current={posicao === indice ? "true" : undefined}
              onClick={() => trocar(posicao)}
            />
          ))}
        </div>
        <button type="button" onClick={() => trocar(indice + 1)}>{textos.proximo}</button>
        <span className="nota">{textos.atalho}</span>
        <div className="fonte">
          <button
            type="button"
            onClick={() => setPassoFonte((passo) => Math.max(0, passo - 1))}
            disabled={passoFonte === 0}
            aria-label="Diminuir a fonte"
          >
            A−
          </button>
          <button
            type="button"
            onClick={() => setPassoFonte((passo) => Math.min(ESCALAS.length - 1, passo + 1))}
            disabled={passoFonte === ESCALAS.length - 1}
            aria-label="Aumentar a fonte"
          >
            A+
          </button>
        </div>
      </footer>
    </main>
  );
}
