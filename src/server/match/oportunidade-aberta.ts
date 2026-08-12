// Filtro de "oportunidade aberta" — fase Watch.
//
// Extrato, resultado, anulação e homologação citam o mesmo termo que o
// assinante vigia, mas não são abertura de seleção. Precisão > cobertura:
// falso positivo no e-mail queima confiança mais que um miss.
//
// Regra nova só entra com caso em fixtures/rotulados/oportunidade-aberta.json.
// Aplica-se a ALERTAS de assinante; classificação SEO por tema NÃO filtra
// (páginas públicas mostram o que saiu no DOE, inclusive burocracia).

import { normalizarTermo } from "./normalizar-texto";

/**
 * Título que indica ato já concluído / burocracia sobre edital passado.
 * Casado no texto normalizado (sem acento, caixa baixa).
 */
const BLOQUEIOS: RegExp[] = [
  /\bextrato\b/,
  /\bresultado\b/,
  /\banula/,
  /\bretifica/,
  /\brepublica/,
  /\bhomolog/,
  /\badjudica/,
  /\brescis/,
  /\bindefer/,
  /\binexigibilidade\b/,
  /\bdispensa\b.{0,40}\bchamamento\b/,
  /\bchamamento\b.{0,40}\bdispensa\b/,
  /\bprestacao\s+de\s+contas\b/,
  /\btermo\s+aditivo\b/,
  /\baditamento\b/,
];

/** True se o título parece abertura / seleção em curso — e não burocracia fechada. */
export function ehOportunidadeAberta(titulo: string): boolean {
  const t = normalizarTermo(titulo);
  if (!t) return false;
  return !BLOQUEIOS.some((r) => r.test(t));
}
