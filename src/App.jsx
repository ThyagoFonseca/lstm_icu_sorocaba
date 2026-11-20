import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  buscarMape,
  carregar,
  controles,
  fatia,
  legendaFatia,
  mesmaConfiguracao,
  nomeEstacao,
  numero,
  opcoes,
  outrosTestes,
  pendentes,
  ranquear,
  rotuloFator,
  rotuloRodada,
} from "./analise.js";

const FATORES = ["janela", "unidades", "epochs", "batch_size", "seed"];
const VERDE = "#3f4f46";
const BARRA = "#c4beb4";

function dica(valor) {
  return numero(valor);
}

export default function App() {
  const { brutas, unicas } = useMemo(carregar, []);
  const listas = opcoes(unicas);
  const [alvo, setAlvo] = useState(listas.alvos.includes("Humidex") ? "Humidex" : listas.alvos[0]);
  const [estacao, setEstacao] = useState(listas.estacoes.includes("ufscar") ? "ufscar" : listas.estacoes[0]);

  const ranking = ranquear(unicas, alvo, estacao);
  const melhor = ranking[0];
  const segunda = ranking[1];
  const referencias = controles(unicas, alvo, estacao);
  const estacoes = melhor ? mesmaConfiguracao(unicas, melhor, alvo) : [];
  const fila = alvo === "Humidex" && estacao === "ufscar" ? pendentes(unicas) : [];
  const fora = outrosTestes(unicas, alvo);
  const melhorUfscar = ranquear(unicas, "Humidex", "ufscar")[0];
  const referenciasUfscar = controles(unicas, "Humidex", "ufscar");
  const svr = referenciasUfscar.find((rodada) => rodada.modelo === "svr");
  const suja = referenciasUfscar.find((rodada) => String(rodada.estacao).includes("sem_limpeza"));
  const efeitos = FATORES.map((fator) => ({ fator, grupo: fatia(ranking, fator) })).filter(
    (item) => item.grupo.length > 1,
  );

  return (
    <main className="miolo">
      <header className="topo">
        <div>
          <p className="olho">Modelo · Humidex do dia seguinte</p>
          <h1>Resultados da LSTM</h1>
          <p className="subtitulo">
            Até agora, a LSTM é o melhor resultado. A SVR, na mesma série, errou mais. O treino com os dados
            sem limpeza manteve o erro na mesma ordem. O ranking abaixo usa o erro absoluto médio no dia
            seguinte, com corte de 80%. Repetições idênticas contam uma vez. Fonte: {brutas.length} execuções.
          </p>
        </div>
        <div className="filtros">
          <label>
            Índice
            <select value={alvo} onChange={(evento) => setAlvo(evento.target.value)}>
              {listas.alvos.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label>
            Estação
            <select value={estacao} onChange={(evento) => setEstacao(evento.target.value)}>
              {listas.estacoes.map((item) => (
                <option key={item} value={item}>
                  {nomeEstacao(item)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      {melhorUfscar && svr && suja && (
        <section className="grade tres">
          <article className="cartao">
            <p className="olho">LSTM · UFSCar</p>
            <DestaqueMape
              rodada={melhorUfscar}
              indice="Humidex"
              complemento={`Menor erro absoluto no Humidex do dia seguinte. ${rotuloRodada(melhorUfscar)}. RMSE ${numero(melhorUfscar.rmse)} · R² ${numero(melhorUfscar.r2)}.`}
            />
          </article>
          <article className="cartao">
            <p className="olho">SVR · mesma série</p>
            <p className="mae pequeno">
              {numero(svr.mae)} <span>MAE</span>
            </p>
            <p className="nota">
              Janela de 14 dias e o mesmo corte. O erro ficou {numero(svr.mae - melhorUfscar.mae)} acima da LSTM. RMSE {numero(svr.rmse)} · R² {numero(svr.r2)}.
            </p>
          </article>
          <article className="cartao">
            <p className="olho">LSTM · série sem limpeza</p>
            <p className="mae pequeno">
              {numero(suja.mae)} <span>MAE</span>
            </p>
            <p className="nota">
              Sem a máscara de quantis, o erro foi {numero(suja.mae)}. A distância para a série limpa é {numero(suja.mae - melhorUfscar.mae)}. O modelo não se desorganizou.
            </p>
          </article>
        </section>
      )}

      {melhor ? (
        <section className="grade">
          <article className="cartao">
            <h2>Melhor rodada · {nomeEstacao(estacao)} · {alvo}</h2>
            <DestaqueMape
              rodada={melhor}
              indice={alvo}
              grande
              complemento={`RMSE ${numero(melhor.rmse)} · R² ${numero(melhor.r2)} · viés ${numero(melhor.vies)}${melhor.repeticoes > 1 ? ` · repetida ${melhor.repeticoes} vezes com o mesmo erro` : ""}. ${rotuloRodada(melhor)}.`}
            />
          </article>
          <article className="cartao">
            <h2>Distância para a segunda</h2>
            {segunda ? (
              <>
                <p className="delta">
                  {numero(segunda.mae - melhor.mae)} <span>de MAE</span>
                </p>
                <p className="parametros">{rotuloRodada(segunda)}</p>
                <p className="nota">MAE {numero(segunda.mae)} · RMSE {numero(segunda.rmse)}</p>
              </>
            ) : (
              <p className="vazio">Esta estação e este índice têm uma configuração só.</p>
            )}
            {referencias.length > 0 && (
              <div className="controles">
                {referencias.map((rodada) => (
                  <article key={chaveVisual(rodada)}>
                    <strong>{numero(rodada.mae)}</strong>
                    <span>
                      {rodada.modelo === "svr" ? "SVR, mesma série" : "LSTM sem limpeza"}
                    </span>
                  </article>
                ))}
              </div>
            )}
          </article>
        </section>
      ) : (
        <p className="cartao">Não há LSTM de horizonte 1 e corte de 80% nesse filtro.</p>
      )}

      {ranking.length > 1 && (
        <section className="cartao bloco">
          <h2>MAE de cada configuração</h2>
          <p className="nota">Eixo horizontal: erro absoluto médio no Humidex, ou no índice escolhido. A barra verde é a menor.</p>
          <ResponsiveContainer width="100%" height={Math.max(260, ranking.length * 36)}>
            <BarChart data={ranking.map(ponto)} layout="vertical" margin={{ left: 24, right: 16, top: 8 }}>
              <CartesianGrid stroke="#e3dac8" horizontal={false} />
              <XAxis type="number" tickFormatter={dica} label={{ value: "MAE", position: "insideBottom", offset: -2 }} />
              <YAxis type="category" dataKey="nome" width={230} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(valor) => [numero(valor), "MAE"]} />
              <Bar dataKey="mae" radius={[0, 4, 4, 0]}>
                {ranking.map((rodada) => (
                  <Cell key={chaveVisual(rodada)} fill={rodada === melhor ? VERDE : BARRA} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </section>
      )}

      {efeitos.length > 0 && (
        <section className="bloco">
          <h2>Um parâmetro por vez</h2>
          <p className="nota">Cada gráfico segura os outros parâmetros. Assim a diferença é do fator no título, não de uma mistura de rodadas.</p>
          <div className="fatores">
            {efeitos.map(({ fator, grupo }) => (
              <article className="cartao" key={fator}>
                <h2>{rotuloFator(fator)}</h2>
                <p className="nota">{legendaFatia(grupo, fator)}</p>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={grupo.map((rodada) => ({ nome: String(rodada[fator]), mae: rodada.mae }))}>
                    <CartesianGrid stroke="#e3dac8" vertical={false} />
                    <XAxis dataKey="nome" />
                    <YAxis tickFormatter={dica} width={42} />
                    <Tooltip formatter={(valor) => [numero(valor), "MAE"]} />
                    <Bar dataKey="mae" fill={VERDE} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </article>
            ))}
          </div>
        </section>
      )}

      {estacoes.length > 1 && (
        <section className="cartao bloco">
          <h2>A mesma configuração nas estações</h2>
          <p className="nota">
            {rotuloRodada(melhor)}. O MAE está na escala do {alvo} de cada lugar. O menor número não torna a série mais fácil de prever. Sorocaba usa o Humidex do valor diário, porque a série do CIIAGRO já chega em dias.
          </p>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={estacoes.map((rodada) => ({ nome: nomeEstacao(rodada.estacao), mae: rodada.mae }))}>
              <CartesianGrid stroke="#e3dac8" vertical={false} />
              <XAxis dataKey="nome" interval={0} tick={{ fontSize: 12 }} angle={-28} textAnchor="end" height={72} />
              <YAxis tickFormatter={dica} width={42} />
              <Tooltip formatter={(valor) => [numero(valor), "MAE"]} />
              <Bar dataKey="mae" fill={VERDE} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>
      )}

      {ranking.length > 0 && (
        <section className="cartao bloco">
          <h2>Registro usado no ranking</h2>
          <table className="tabela">
            <thead>
              <tr>
                <th>Configuração</th>
                <th>MAE</th>
                <th>MAPE</th>
                <th>RMSE</th>
                <th>R²</th>
                <th>Viés</th>
                <th>Vezes</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((rodada) => (
                <tr key={chaveVisual(rodada)} className={rodada === melhor ? "melhor" : ""}>
                  <td>{rotuloRodada(rodada)}</td>
                  <td>{numero(rodada.mae)}</td>
                  <td className="destaque-mape">{celulaMape(rodada, alvo)}</td>
                  <td>{numero(rodada.rmse)}</td>
                  <td>{numero(rodada.r2)}</td>
                  <td>{numero(rodada.vies)}</td>
                  <td>{rodada.repeticoes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {fora.length > 0 && (
        <section className="cartao bloco">
          <h2>Testes fora do ranking</h2>
          <p className="nota">
            Horizonte 7 prevê o sétimo dia. O corte de 70% troca o conjunto de teste. Os dois ficam de fora da comparação do dia seguinte com corte de 80%. Sorocaba entra nessa comparação, com a configuração escolhida.
          </p>
          <table className="tabela">
            <thead>
              <tr>
                <th>Estação</th>
                <th>Configuração</th>
                <th>MAE</th>
                <th>RMSE</th>
                <th>R²</th>
                <th>Viés</th>
              </tr>
            </thead>
            <tbody>
              {fora.map((rodada) => (
                <tr key={chaveVisual(rodada)}>
                  <td>{nomeEstacao(rodada.estacao)}</td>
                  <td>
                    {rotuloRodada(rodada)}
                    {rodada.horizonte !== 1 ? ` · horizonte ${rodada.horizonte}` : ""}
                    {rodada.proporcao_treino !== 0.8 ? ` · corte ${Math.round(rodada.proporcao_treino * 100)}%` : ""}
                  </td>
                  <td>{numero(rodada.mae)}</td>
                  <td>{numero(rodada.rmse)}</td>
                  <td>{numero(rodada.r2)}</td>
                  <td>{numero(rodada.vies)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="fonte">Uma segunda camada LSTM também não foi rodada nesta arquitetura de uma camada.</p>
        </section>
      )}

      {fila.length > 0 && (
        <section className="cartao bloco">
          <h2>Configurações que ainda faltam</h2>
          <ul className="lista">
            {fila.map((cfg) => (
              <li key={rotuloRodada(cfg) + cfg.horizonte + cfg.proporcao_treino}>
                <strong>
                  {rotuloRodada(cfg)}
                  {cfg.horizonte !== 1 ? ` · horizonte ${cfg.horizonte}` : ""}
                  {cfg.proporcao_treino !== 0.8 ? ` · corte ${Math.round(cfg.proporcao_treino * 100)}%` : ""}
                </strong>
                {!cfg.comparavel && <span className="etiqueta">outro teste</span>}
                <p className="nota">{cfg.porque}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

function ponto(rodada, indice, lista) {
  return { nome: rotuloRodada(rodada), mae: rodada.mae, melhor: rodada === lista[0] };
}

function DestaqueMape({ rodada, indice, complemento, grande = false }) {
  const item = buscarMape(rodada.estacao, indice, rodada.mae);
  if (!item) {
    return (
      <>
        <p className={grande ? "mae" : "mae pequeno"}>
          {numero(rodada.mae)} <span>MAE</span>
        </p>
        <p className="nota">{complemento}</p>
      </>
    );
  }
  return (
    <>
      <p className={grande ? "mape" : "mape pequeno"}>
        {numero(item.mape)}% <span>MAPE</span>
      </p>
      <p className="nota">
        Em média, a previsão erra essa parte do {indice} daquele dia. Repetir o dia anterior erra {numero(item.mapeOntem)}%. MAE {numero(rodada.mae)}. {complemento}
      </p>
    </>
  );
}

function celulaMape(rodada, indice) {
  const item = buscarMape(rodada.estacao, indice, rodada.mae);
  return item ? `${numero(item.mape)}%` : "";
}

function chaveVisual(rodada) {
  return `${rodada.estacao}-${rodada.modelo}-${rotuloRodada(rodada)}-${rodada.horizonte}-${rodada.proporcao_treino}`;
}
