import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const aqui = path.dirname(fileURLToPath(import.meta.url));
const origem = path.resolve(aqui, "../graficos_lstm");
const destino = path.resolve(aqui, "src/dados-graficos");
const figuras = path.resolve(aqui, "public/figuras");

function pular(texto, i) {
  while (i < texto.length && " \t\r\n".includes(texto[i])) i += 1;
  return i;
}

function lerJson(texto, inicio) {
  const i = pular(texto, inicio);
  const abre = texto[i];
  if (abre !== "{" && abre !== "[") throw new Error(`json em ${i}: ${texto.slice(i, i + 40)}`);
  const fecha = abre === "{" ? "}" : "]";
  let profundidade = 0;
  let aspas = false;
  let escape = false;
  for (let p = i; p < texto.length; p += 1) {
    const c = texto[p];
    if (aspas) {
      if (escape) escape = false;
      else if (c === "\\") escape = true;
      else if (c === '"') aspas = false;
      continue;
    }
    if (c === '"') aspas = true;
    else if (c === abre) profundidade += 1;
    else if (c === fecha) {
      profundidade -= 1;
      if (profundidade === 0) {
        const bruto = texto.slice(i, p + 1);
        return { valor: JSON.parse(bruto), fim: p + 1 };
      }
    }
  }
  throw new Error("json sem fim");
}

function decodificar(valor) {
  if (Array.isArray(valor)) return valor.map(decodificar);
  if (!valor || typeof valor !== "object") return valor;
  if (typeof valor.bdata === "string" && typeof valor.dtype === "string") {
    const buf = Buffer.from(valor.bdata, "base64");
    const saida = [];
    if (valor.dtype === "f8") {
      for (let i = 0; i < buf.length; i += 8) saida.push(buf.readDoubleLE(i));
    } else if (valor.dtype === "f4") {
      for (let i = 0; i < buf.length; i += 4) saida.push(buf.readFloatLE(i));
    } else if (valor.dtype === "i4") {
      for (let i = 0; i < buf.length; i += 4) saida.push(buf.readInt32LE(i));
    } else {
      throw new Error(`dtype ${valor.dtype}`);
    }
    return saida;
  }
  const objeto = {};
  for (const chave of Object.keys(valor)) objeto[chave] = decodificar(valor[chave]);
  return objeto;
}

function dia(valor) {
  if (typeof valor !== "string") return valor;
  return valor.slice(0, 10);
}

function tituloDe(layout) {
  const titulo = layout?.title;
  const texto = typeof titulo === "string" ? titulo : titulo?.text || "";
  return texto.replace(/<br\s*\/?>/gi, " ").replace(/\s+/g, " ").trim();
}

function serieDe(traces) {
  const observado = traces.find((traco) => traco.name !== "previsto") ?? traces[0];
  const previsto = traces.find((traco) => traco.name === "previsto");
  const dias = observado.x.map(dia);
  const pontos = dias.map((data, i) => ({ d: data, o: observado.y[i] }));
  const previsao = previsto
    ? previsto.x.map((data, i) => ({ d: dia(data), p: previsto.y[i] }))
    : [];
  return { nome: String(observado.name ?? "série"), pontos, previsao };
}

function dispersaoDe(traces) {
  const nuvem = traces[0];
  const erro = Array.isArray(nuvem.marker?.color) ? nuvem.marker.color : [];
  const pontos = nuvem.x.map((real, i) => ({
    r: real,
    p: nuvem.y[i],
    e: erro[i] ?? Math.abs(nuvem.y[i] - real),
  }));
  return { pontos };
}

function extrair(nome) {
  const html = fs.readFileSync(path.join(origem, nome), "utf8");
  const marca = "Plotly.newPlot(";
  const inicio = html.lastIndexOf(marca);
  if (inicio < 0) throw new Error(`${nome} sem Plotly.newPlot`);
  let pos = pular(html, inicio + marca.length);
  if (html[pos] === '"') {
    const id = lerJsonNao(html, pos);
    pos = pular(html, id);
    if (html[pos] === ",") pos += 1;
  }
  const dados = lerJson(html, pos);
  pos = pular(html, dados.fim);
  if (html[pos] === ",") pos += 1;
  const layout = lerJson(html, pos);
  const traces = decodificar(dados.valor);
  const titulo = tituloDe(decodificar(layout.valor));
  if (traces[0]?.mode === "markers" || traces[0]?.marker) {
    return { titulo, ...dispersaoDe(traces) };
  }
  return { titulo, ...serieDe(traces) };
}

function lerJsonNao(html, pos) {
  let escape = false;
  for (let p = pos + 1; p < html.length; p += 1) {
    const c = html[p];
    if (escape) escape = false;
    else if (c === "\\") escape = true;
    else if (c === '"') return p + 1;
  }
  throw new Error("string sem fim");
}

fs.mkdirSync(destino, { recursive: true });
fs.mkdirSync(figuras, { recursive: true });
for (const antigo of fs.readdirSync(destino)) fs.unlinkSync(path.join(destino, antigo));

const indice = [];
for (const nome of fs.readdirSync(origem)) {
  if (nome.endsWith(".png")) {
    fs.copyFileSync(path.join(origem, nome), path.join(figuras, nome));
    indice.push({ arquivo: nome, tipo: "figura" });
    continue;
  }
  if (!nome.endsWith(".html")) continue;
  const dado = extrair(nome);
  const id = nome.replace(/\.html$/, "");
  fs.writeFileSync(path.join(destino, `${id}.json`), JSON.stringify(dado));
  indice.push({ arquivo: nome, id });
  process.stdout.write(".");
}

fs.writeFileSync(path.join(destino, "indice.json"), JSON.stringify(indice));
console.log(`\n${indice.length} itens`);
