import { humanizarTitulo } from "../alerta/render";

/** Resumo curto e humano — template, sem LLM. */
export function resumirOportunidade(input: {
  titulo: string;
  excerpt: string | null;
  orgao: string | null;
  causaNome: string;
  regiaoNome: string;
}): string {
  const titulo = humanizarTitulo(input.titulo);
  const quem = input.orgao ?? "Órgão público";
  const trecho = (input.excerpt ?? "").replace(/\s+/g, " ").trim().slice(0, 140);
  const base = `${titulo} — ${quem}. Combina com ${input.causaNome.toLowerCase()} (${input.regiaoNome}).`;
  if (!trecho) return base;
  return `${base} ${trecho}${trecho.length >= 140 ? "…" : ""}`;
}
