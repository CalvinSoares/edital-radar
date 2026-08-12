// Motor de match por keyword — fase Watch.
//
// PURO: sem I/O, sem Date, sem random, sem env (invariante da base de
// conhecimentos). Regra nova só entra com exemplo correspondente em
// fixtures/rotulados/.
//
// Regras de match:
// - insensível a caixa e acento ("credito" acha "Crédito")
// - fronteira de palavra ("arte" NÃO acha "parte") — precisão > cobertura
// - espaços no termo casam qualquer sequência de espaço/quebra no texto
// - campos na ordem título > excerpt > content; para no primeiro que casar

import { normalizarPreservandoIndices, normalizarTermo } from "./normalizar-texto";

export type PublicacaoParaMatch = {
  slug: string;
  titulo: string;
  excerpt: string | null;
  content?: string | null;
};

export type KeywordParaMatch = {
  id: string;
  assinanteId: string;
  termo: string;
};

export type CampoDeMatch = "titulo" | "excerpt" | "content";

export type ResultadoDeMatch = {
  assinanteId: string;
  keywordId: string;
  termo: string;
  slug: string;
  campo: CampoDeMatch;
  /** Trecho do texto ORIGINAL ao redor da ocorrência, para o e-mail. */
  trecho: string;
};

const TRECHO_ANTES = 80;
const TRECHO_DEPOIS = 140;

function escaparRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Exportada para o render do e-mail destacar o termo no trecho. */
export function regexDoTermo(termoNormalizado: string): RegExp {
  const corpo = termoNormalizado.split(" ").map(escaparRegex).join("\\s+");
  // Fronteira: vizinho não pode ser letra/dígito (no texto já normalizado).
  return new RegExp(`(?<![a-z0-9])${corpo}(?![a-z0-9])`);
}

function extrairTrecho(original: string, inicio: number, fim: number): string {
  const de = Math.max(0, inicio - TRECHO_ANTES);
  const ate = Math.min(original.length, fim + TRECHO_DEPOIS);
  const prefixo = de > 0 ? "…" : "";
  const sufixo = ate < original.length ? "…" : "";
  return `${prefixo}${original.slice(de, ate).replace(/\s+/g, " ").trim()}${sufixo}`;
}

function casarNoCampo(
  original: string | null | undefined,
  regex: RegExp,
): { trecho: string } | null {
  if (!original) return null;
  const normalizado = normalizarPreservandoIndices(original);
  const m = regex.exec(normalizado);
  if (!m) return null;
  return { trecho: extrairTrecho(original, m.index, m.index + m[0].length) };
}

/**
 * Casa uma publicação contra uma lista de keywords (de qualquer assinante).
 * Devolve um resultado por keyword que casou. A deduplicação por
 * (assinante, publicação) é papel da SELEÇÃO, garantida pelo UNIQUE no banco.
 */
export function casarKeywords(
  pub: PublicacaoParaMatch,
  keywords: readonly KeywordParaMatch[],
): ResultadoDeMatch[] {
  const resultados: ResultadoDeMatch[] = [];

  for (const kw of keywords) {
    const termoNormalizado = normalizarTermo(kw.termo);
    if (termoNormalizado.length < 3) continue; // termo curto demais = ruído
    const regex = regexDoTermo(termoNormalizado);

    const campos: [CampoDeMatch, string | null | undefined][] = [
      ["titulo", pub.titulo],
      ["excerpt", pub.excerpt],
      ["content", pub.content],
    ];

    for (const [campo, texto] of campos) {
      const hit = casarNoCampo(texto, regex);
      if (hit) {
        resultados.push({
          assinanteId: kw.assinanteId,
          keywordId: kw.id,
          termo: kw.termo,
          slug: pub.slug,
          campo,
          trecho: hit.trecho,
        });
        break; // primeiro campo que casa encerra esta keyword
      }
    }
  }

  return resultados;
}
