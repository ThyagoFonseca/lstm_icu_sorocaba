import {
  Brush,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { numero } from "./analise.js";

const TINTA = "#2c2924";
const VERDE = "#3f4f46";
const VERMELHO = "#8c2f2f";
const BARRA = "#c4beb4";
const LINHA = "#e3dac8";
const MUDO = "#6d675e";
const PAPEL = "#fbf8f2";

function dataCurta(iso) {
  if (!iso || iso.length < 10) return iso ?? "";
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}

function dataCheia(iso) {
  if (!iso || iso.length < 10) return iso ?? "";
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}

function corDoErro(erro, teto) {
  const parte = teto > 0 ? Math.min(1, Math.max(0, erro / teto)) : 0;
  const claro = [196, 190, 180];
  const escuro = [44, 41, 36];
  const rgb = claro.map((canal, i) => Math.round(canal + (escuro[i] - canal) * parte));
  return `rgb(${rgb.join(",")})`;
}

function DicaSerie({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="dica-grafico">
      <p>{dataCheia(label)}</p>
      {payload.map((item) => (
        <p key={item.dataKey}>
          {item.name} <strong>{numero(item.value)}</strong>
        </p>
      ))}
    </div>
  );
}

function DicaDispersao({ active, payload }) {
  const ponto = payload?.find((item) => item.payload?.e != null)?.payload;
  if (!active || !ponto) return null;
  return (
    <div className="dica-grafico">
      <p>
        real <strong>{numero(ponto.r)}</strong>
      </p>
      <p>
        previsto <strong>{numero(ponto.p)}</strong>
      </p>
      <p>
        |erro| <strong>{numero(ponto.e)}</strong>
      </p>
    </div>
  );
}

export function SerieDiaria({ dado, altura = 440 }) {
  const mapa = new Map();
  for (const ponto of dado.pontos) mapa.set(ponto.d, { d: ponto.d, o: ponto.o, p: null });
  for (const ponto of dado.previsao) {
    const atual = mapa.get(ponto.d) ?? { d: ponto.d, o: null, p: null };
    atual.p = ponto.p;
    mapa.set(ponto.d, atual);
  }
  const linhas = [...mapa.values()].sort((a, b) => a.d.localeCompare(b.d));

  return (
    <div className="painel-grafico">
      <ResponsiveContainer width="100%" height={altura}>
        <LineChart data={linhas} margin={{ top: 28, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid stroke={LINHA} vertical={false} />
          <XAxis
            dataKey="d"
            tickFormatter={dataCurta}
            minTickGap={28}
            tick={{ fill: MUDO, fontSize: 12 }}
            axisLine={{ stroke: LINHA }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: MUDO, fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={48}
            domain={["auto", "auto"]}
          />
          <Tooltip content={<DicaSerie />} cursor={{ stroke: BARRA }} />
          <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: 13, color: TINTA, top: 0 }} />
          <Line
            type="monotone"
            dataKey="o"
            name={dado.nome}
            stroke={MUDO}
            strokeWidth={1.6}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="p"
            name="previsto"
            stroke={VERMELHO}
            strokeWidth={2.4}
            dot={false}
          />
          <Brush
            dataKey="d"
            height={26}
            stroke={VERDE}
            fill={PAPEL}
            tickFormatter={dataCurta}
            travellerWidth={8}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function Dispersao({ dado }) {
  const teto = dado.pontos.reduce((maior, ponto) => Math.max(maior, ponto.e), 0);
  const valores = dado.pontos.flatMap((ponto) => [ponto.r, ponto.p]);
  const baixo = Math.min(...valores);
  const alto = Math.max(...valores);
  const folga = (alto - baixo) * 0.05 || 1;
  const dominio = [baixo - folga, alto + folga];
  const reta = [
    { r: dominio[0], p: dominio[0] },
    { r: dominio[1], p: dominio[1] },
  ];

  return (
    <div className="painel-grafico dispersao">
      <p className="escala">
        <span>erro menor</span>
        <i />
        <span>erro maior</span>
      </p>
      <div className="quadro-dispersao">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 12, right: 16, left: 0, bottom: 16 }}>
            <CartesianGrid stroke={LINHA} />
            <XAxis
              type="number"
              dataKey="r"
              domain={dominio}
              tick={{ fill: MUDO, fontSize: 12 }}
              axisLine={{ stroke: LINHA }}
              tickLine={false}
              tickFormatter={(valor) => numero(valor, 0)}
              label={{ value: "real", position: "insideBottom", offset: -2, fill: MUDO, fontSize: 12 }}
            />
            <YAxis
              type="number"
              dataKey="p"
              domain={dominio}
              tick={{ fill: MUDO, fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={48}
              tickFormatter={(valor) => numero(valor, 0)}
              label={{ value: "previsto", angle: -90, position: "insideLeft", fill: MUDO, fontSize: 12 }}
            />
            <Tooltip content={<DicaDispersao />} cursor={{ strokeDasharray: "3 3", stroke: BARRA }} />
            <Scatter name="45°" data={reta} line={{ stroke: TINTA, strokeDasharray: "4 4" }} shape={() => null} legendType="none" />
            <Scatter name="previsto" data={dado.pontos}>
              {dado.pontos.map((ponto) => (
                <Cell key={`${ponto.r}-${ponto.p}-${ponto.e}`} fill={corDoErro(ponto.e, teto)} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
