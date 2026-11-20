import { PaginaTexto } from "./texto.jsx";
import textos from "./textos.json";

export default function Inicio() {
  return <PaginaTexto texto={textos} />;
}
