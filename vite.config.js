import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

const pasta = path.dirname(fileURLToPath(import.meta.url));
const graficos = path.resolve(pasta, "../graficos_lstm");

function servirGraficos() {
  const tratar = (req, res, next) => {
    const bruto = decodeURIComponent((req.url || "/").split("?")[0]);
    if (bruto === "/api/graficos") {
      const nomes = fs
        .readdirSync(graficos)
        .filter((nome) => nome.endsWith(".html") || nome.endsWith(".png"));
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify(nomes));
      return;
    }
    if (!bruto.startsWith("/graficos/")) return next();
    const nome = bruto.slice("/graficos/".length);
    if (!nome || nome.includes("/") || nome.includes("\\") || nome.includes("..")) {
      res.statusCode = 400;
      res.end();
      return;
    }
    const arquivo = path.resolve(graficos, nome);
    const relativo = path.relative(graficos, arquivo);
    if (relativo.startsWith("..") || path.isAbsolute(relativo) || !fs.existsSync(arquivo)) {
      res.statusCode = 404;
      res.end();
      return;
    }
    res.setHeader("Content-Type", nome.endsWith(".png") ? "image/png" : "text/html; charset=utf-8");
    fs.createReadStream(arquivo).pipe(res);
  };
  return {
    name: "servir-graficos-lstm",
    configureServer(server) {
      server.middlewares.use(tratar);
    },
    configurePreviewServer(server) {
      server.middlewares.use(tratar);
    },
  };
}

const arquivoParaEnviar = "Ilhas de calor - Sorocaba.html";

function publicarArquivoUnico() {
  return {
    name: "arquivo-para-enviar",
    apply: "build",
    closeBundle() {
      const origem = path.resolve(pasta, "dist", "index.html");
      const destino = path.resolve(pasta, arquivoParaEnviar);
      const html = fs.readFileSync(origem, "utf8");
      const scriptExterno = [...html.matchAll(/<script\b([^>]*)>/gi)].some((marca) => /\ssrc\s*=/.test(marca[1]));
      const estiloExterno = [...html.matchAll(/<link\b([^>]*)>/gi)].some((marca) => {
        const href = marca[1].match(/\shref\s*=\s*"([^"]+)"/);
        return href && !/^(https?:|data:)/.test(href[1]);
      });
      if (scriptExterno || estiloExterno) {
        throw new Error("A build ainda aponta para arquivos soltos. O arquivo único não foi gerado.");
      }
      fs.copyFileSync(origem, destino);
      fs.rmSync(path.resolve(pasta, "dist"), { recursive: true, force: true });
    },
  };
}

export default defineConfig({
  plugins: [react(), servirGraficos(), viteSingleFile(), publicarArquivoUnico()],
  server: {
    fs: { allow: [path.resolve(pasta, "..")] },
  },
});
