import { useEffect } from "react";
import { REFERENCIAS } from "./referencias.js";

function enderecoCurto(url) {
  try {
    const endereco = new URL(url);
    if (endereco.hostname === "doi.org") return url.replace(/^https?:\/\//, "");
    return endereco.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function irParaAncora() {
  const id = window.location.hash.split("/")[2];
  if (!id) return;
  document.getElementById(id)?.scrollIntoView({ block: "start" });
}

export default function Referencias() {
  useEffect(() => {
    irParaAncora();
    window.addEventListener("hashchange", irParaAncora);
    return () => window.removeEventListener("hashchange", irParaAncora);
  }, []);

  return (
    <article className="leitura bibliografia">
      <p className="olho">Projeto de iniciação científica</p>
      <h1>Referências</h1>
      <p>
        São as obras citadas no texto do projeto, na forma registrada no arquivo bibliográfico. O link aparece
        quando esse registro traz DOI ou URL.
      </p>
      <ol className="refs">
        {REFERENCIAS.map((obra) => (
          <li id={obra.id} key={obra.id}>
            <p>{obra.texto}</p>
            {obra.link && (
              <a href={obra.link} target="_blank" rel="noreferrer">
                {enderecoCurto(obra.link)}
              </a>
            )}
          </li>
        ))}
      </ol>
    </article>
  );
}
