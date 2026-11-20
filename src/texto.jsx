const MARCA = /\[\[([^\]|]+)\|([^\]]+)\]\]|<(sub|sup|em|strong)>([\s\S]*?)<\/\3>/g;

export function Texto({ children }) {
  const texto = String(children ?? "");
  const partes = [];
  let ultimo = 0;
  let chave = 0;
  for (const marca of texto.matchAll(new RegExp(MARCA.source, "g"))) {
    if (marca.index > ultimo) partes.push(texto.slice(ultimo, marca.index));
    if (marca[1]) {
      partes.push(
        <a className="cita" href={`#/referencias/${marca[1]}`} key={chave}>
          {marca[2]}
        </a>,
      );
    } else {
      const Tag = marca[3];
      partes.push(
        <Tag key={chave}>
          <Texto>{marca[4]}</Texto>
        </Tag>,
      );
    }
    chave += 1;
    ultimo = marca.index + marca[0].length;
  }
  if (ultimo < texto.length) partes.push(texto.slice(ultimo));
  return partes;
}

function Bloco({ bloco }) {
  if (bloco.tipo === "h2") return <h2>{bloco.texto}</h2>;
  if (bloco.tipo === "h3") return <h3>{bloco.texto}</h3>;
  if (bloco.tipo === "p" || bloco.tipo === "equacao") {
    return (
      <p className={bloco.tipo === "equacao" ? "equacao" : bloco.classe} lang={bloco.lang}>
        <Texto>{bloco.texto}</Texto>
      </p>
    );
  }
  if (bloco.tipo === "citacao") {
    return (
      <blockquote>
        <p>
          <Texto>{bloco.texto}</Texto>
        </p>
      </blockquote>
    );
  }
  if (bloco.tipo === "lista") {
    return (
      <ol>
        {bloco.itens.map((item) => (
          <li key={item}>
            <Texto>{item}</Texto>
          </li>
        ))}
      </ol>
    );
  }
  if (bloco.tipo === "tabela") {
    return (
      <div className="rolagem">
        <table className="quadro">
          <caption>{bloco.legenda}</caption>
          <thead>
            <tr>
              {bloco.colunas.map((coluna) => (
                <th key={coluna}>{coluna}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bloco.linhas.map((linha) => (
              <tr key={linha.join("|")}>
                {linha.map((celula) => (
                  <td key={celula}>
                    <Texto>{celula}</Texto>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  if (bloco.tipo === "grupo") {
    return (
      <section className={bloco.classe}>
        {bloco.blocos.map((filho) => (
          <Bloco key={`${filho.tipo}-${filho.texto || filho.legenda}`} bloco={filho} />
        ))}
      </section>
    );
  }
  return null;
}

export function PaginaTexto({ texto }) {
  return (
    <article className="leitura">
      <p className="olho">{texto.olho}</p>
      <h1>{texto.titulo}</h1>
      {texto.blocos.map((bloco) => (
        <Bloco key={`${bloco.tipo}-${bloco.texto || bloco.legenda || bloco.classe}`} bloco={bloco} />
      ))}
    </article>
  );
}
