// Detecta retificação/republicação e tenta vincular a um edital já alertado.
// Precisão > recall: sem vínculo claro, não cria aviso.
// Regra nova → fixtures/rotulados/retificacao.json

import { normalizarTermo } from "./normalizar-texto";

const SINAL_RETIFICACAO = /\b(retifica|republica)/;

/** Título parece retificação ou republicação (não abertura nova). */
export function pareceRetificacao(titulo: string): boolean {
  const t = normalizarTermo(titulo);
  return Boolean(t && SINAL_RETIFICACAO.test(t));
}

/**
 * Extrai números de edital/processo (ex.: 005/2026, 14/2026).
 * Preferência a padrões com ano de 4 dígitos.
 */
export function extrairChavesEdital(titulo: string): string[] {
  const t = normalizarTermo(titulo);
  if (!t) return [];
  const chaves = new Set<string>();
  const re = /\b(\d{1,4})\s*[\/.\-]\s*(\d{2,4})\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(t))) {
    const a = m[1]!.replace(/^0+/, "") || "0";
    const b = m[2]!;
    const ano = b.length === 2 ? `20${b}` : b;
    chaves.add(`${a}/${ano}`);
  }
  return [...chaves];
}

/** Remove prefixo de retificação para comparar o restante com o título original. */
export function tituloSemPrefixoRetificacao(titulo: string): string {
  return normalizarTermo(titulo)
    .replace(/^(retificacao|republicacao)\s+(do|da|de|dos|das)?\s*/, "")
    .trim();
}

export type AlertaAnteriorParaRetificacao = {
  alertaId: string;
  assinanteId: string;
  titulo: string;
  hierarchy: string | null;
};

/**
 * Escolhe no máximo um alerta anterior por assinante.
 * Critério: compartilha chave de edital; desempate por hierarchy; senão skip.
 */
export function vincularRetificacao(
  tituloRetificacao: string,
  hierarchy: string | null,
  anteriores: readonly AlertaAnteriorParaRetificacao[],
): AlertaAnteriorParaRetificacao | null {
  if (!pareceRetificacao(tituloRetificacao) || anteriores.length === 0) return null;

  const chaves = extrairChavesEdital(tituloRetificacao);
  const resto = tituloSemPrefixoRetificacao(tituloRetificacao);

  const pontuados = anteriores
    .map((a) => {
      const chavesOrig = extrairChavesEdital(a.titulo);
      const chaveOk =
        chaves.length > 0 && chavesOrig.some((c) => chaves.includes(c));
      const hierOk =
        hierarchy && a.hierarchy
          ? hierarchy.split("/")[0] === a.hierarchy.split("/")[0]
          : false;
      const tokensResto = new Set(resto.split(/\s+/).filter((w) => w.length > 3));
      const tokensOrig = normalizarTermo(a.titulo).split(/\s+/);
      const overlap = tokensOrig.filter((w) => tokensResto.has(w)).length;
      let score = 0;
      if (chaveOk) score += 10;
      if (hierOk) score += 2;
      if (overlap >= 2) score += 3;
      return { a, score };
    })
    .filter((x) => x.score >= 10) // exige número de edital em comum
    .sort((x, y) => y.score - x.score);

  if (pontuados.length === 0) return null;
  // Empate entre assinantes diferentes: cada um tem seu próprio alerta.
  // Empate no mesmo assinante: pega o de maior score (já ordenado).
  return pontuados[0]!.a;
}
