import { useEffect, useState } from "react";
import App from "./App.jsx";
import Apresentacao from "./Apresentacao.jsx";
import Graficos from "./Graficos.jsx";
import Inicio from "./Inicio.jsx";
import Referencias from "./Referencias.jsx";
import { ESTACOES_MENU } from "./graficos.js";

function paginaAtual() {
  const hash = window.location.hash.replace(/^#/, "");
  if (hash.startsWith("/graficos")) return "graficos";
  if (hash.startsWith("/apresentacao")) return "apresentacao";
  if (hash.startsWith("/resultados")) return "resultados";
  if (hash.startsWith("/referencias")) return "referencias";
  return "inicio";
}

export default function Site() {
  const [pagina, setPagina] = useState(paginaAtual);
  const [menuAberto, setMenuAberto] = useState(false);

  useEffect(() => {
    const aoMudar = () => {
      const hash = window.location.hash.replace(/^#/, "");
      setPagina(paginaAtual());
      setMenuAberto(false);
      if (!hash.startsWith("/referencias/")) window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", aoMudar);
    return () => window.removeEventListener("hashchange", aoMudar);
  }, []);

  return (
    <>
      <header className="menu">
        <a className="marca" href="#/">
          Ilhas de calor
          <span>Sorocaba</span>
        </a>
        <nav className="navegacao" aria-label="Seções">
          <a href="#/" aria-current={pagina === "inicio" ? "page" : undefined}>
            O projeto
          </a>
          <a href="#/referencias" aria-current={pagina === "referencias" ? "page" : undefined}>
            Referências
          </a>
          <a href="#/resultados" aria-current={pagina === "resultados" ? "page" : undefined}>
            Resultados
          </a>
          <a href="#/apresentacao" aria-current={pagina === "apresentacao" ? "page" : undefined}>
            Apresentação
          </a>
          <div
            className="submenu"
            onMouseEnter={() => setMenuAberto(true)}
            onMouseLeave={() => setMenuAberto(false)}
          >
            <a
              href="#/graficos/ufscar/Humidex/serie"
              aria-current={pagina === "graficos" ? "page" : undefined}
            >
              Gráficos
            </a>
            <button
              type="button"
              aria-expanded={menuAberto}
              aria-label="Estações dos gráficos"
              onClick={() => setMenuAberto((aberto) => !aberto)}
            >
              ▾
            </button>
            {menuAberto && (
              <div className="painel-menu">
                {ESTACOES_MENU.map((estacao) => (
                  <a key={estacao.id} href={`#/graficos/${estacao.id}/Humidex/serie`}>
                    {estacao.nome}
                  </a>
                ))}
              </div>
            )}
          </div>
          <a href="https://urbverde.iau.usp.br" target="_blank" rel="noreferrer">
            UrbVerde
          </a>
        </nav>
      </header>
      {pagina === "inicio" && <Inicio />}
      {pagina === "referencias" && <Referencias />}
      {pagina === "resultados" && <App />}
      {pagina === "apresentacao" && <Apresentacao />}
      {pagina === "graficos" && <Graficos />}
    </>
  );
}
