// Match por perfil Radar — puro, auditável, sem LLM.
// Casa se: (1) oportunidade aberta, (2) ao menos uma causa, (3) ao menos
// uma região, (4) prazo não vencido (quando houver prazo extraído).

import { casarKeywords, type KeywordParaMatch, type ResultadoDeMatch } from "./casar-keywords";
import { normalizarTermo } from "./normalizar-texto";
import { ehOportunidadeAberta } from "./oportunidade-aberta";
import {
  CATALOGO_DE_CAUSAS,
  CATALOGO_DE_REGIOES,
  type CausaDoCatalogo,
  type RegiaoDoCatalogo,
} from "./perfil-catalogo";
import { extrairPrazo } from "./prazo";
import { resumirOportunidade } from "./resumo";
import { municipioDoSlugPublicacao } from "../seo/municipio";

export type PerfilParaMatch = {
  assinanteId: string;
  causas: string[];
  regioes: string[];
};

export type PublicacaoParaPerfil = {
  slug: string;
  titulo: string;
  excerpt: string | null;
  content?: string | null;
  hierarchy?: string | null;
};

export type ResultadoDeMatchPerfil = ResultadoDeMatch & {
  origem: "perfil";
  resumo: string;
  prazoEm: Date | null;
  prazoTrecho: string | null;
  causaSlug: string;
  regiaoSlug: string;
};

function regioesDoCatalogo(slugs: string[]): RegiaoDoCatalogo[] {
  return slugs.map((s) => CATALOGO_DE_REGIOES.find((r) => r.slug === s)).filter(Boolean) as RegiaoDoCatalogo[];
}

function causasDoCatalogo(slugs: string[]): CausaDoCatalogo[] {
  return slugs.map((s) => CATALOGO_DE_CAUSAS.find((c) => c.slug === s)).filter(Boolean) as CausaDoCatalogo[];
}

/** True se a publicação cai na região do perfil. */
export function casaRegiao(
  pub: PublicacaoParaPerfil,
  regiao: RegiaoDoCatalogo,
): boolean {
  if (regiao.regra.tipo === "todo-sp") return true;

  if (regiao.regra.tipo === "municipio") {
    const m = municipioDoSlugPublicacao(pub.slug);
    return m?.slug === regiao.regra.municipioSlug;
  }

  const haystack = normalizarTermo(
    `${pub.slug} ${pub.hierarchy ?? ""} ${pub.titulo} ${pub.excerpt ?? ""}`,
  );
  return regiao.regra.trechos.some((t) => haystack.includes(normalizarTermo(t)));
}

/**
 * Casa uma publicação contra um perfil. Devolve no máximo 1 resultado
 * (melhor causa). Sem keywordId — origem perfil.
 */
export function casarPerfil(
  pub: PublicacaoParaPerfil,
  perfil: PerfilParaMatch,
  agora: Date = new Date(),
): ResultadoDeMatchPerfil | null {
  if (!ehOportunidadeAberta(pub.titulo)) return null;

  const regioes = regioesDoCatalogo(perfil.regioes);
  const causas = causasDoCatalogo(perfil.causas);
  if (regioes.length === 0 || causas.length === 0) return null;

  const regiaoHit = regioes.find((r) => casaRegiao(pub, r));
  if (!regiaoHit) return null;

  const keywords: KeywordParaMatch[] = causas.flatMap((c) =>
    c.termos.map((termo, i) => ({
      id: `perfil:${c.slug}#${i}`,
      assinanteId: c.slug,
      termo,
    })),
  );

  const hits = casarKeywords(
    { slug: pub.slug, titulo: pub.titulo, excerpt: pub.excerpt, content: pub.content },
    keywords,
  );
  if (hits.length === 0) return null;

  const melhor = hits[0]!;
  const causaSlug = melhor.assinanteId;
  const causa = causas.find((c) => c.slug === causaSlug);

  const textoPrazo = [pub.titulo, pub.excerpt ?? "", pub.content ?? ""].join("\n");
  const prazo = extrairPrazo(textoPrazo, agora);
  if (prazo && prazo.vencido) return null;

  const orgao = orgaoDe(pub.hierarchy);
  const resumo = resumirOportunidade({
    titulo: pub.titulo,
    excerpt: pub.excerpt,
    orgao,
    causaNome: causa?.nome ?? causaSlug,
    regiaoNome: regiaoHit.nome,
  });

  return {
    assinanteId: perfil.assinanteId,
    keywordId: null,
    termo: causa?.nome ?? melhor.termo,
    slug: pub.slug,
    campo: melhor.campo,
    trecho: melhor.trecho,
    origem: "perfil",
    resumo,
    prazoEm: prazo?.data ?? null,
    prazoTrecho: prazo?.trecho ?? null,
    causaSlug,
    regiaoSlug: regiaoHit.slug,
  };
}

function orgaoDe(hierarchy: string | null | undefined): string | null {
  const partes = hierarchy?.split(">").map((s) => s.trim()) ?? [];
  return partes[2] ?? partes[1] ?? null;
}

/** Casa uma publicação contra vários perfis Radar. */
export function casarPerfis(
  pub: PublicacaoParaPerfil,
  perfis: readonly PerfilParaMatch[],
  agora?: Date,
): ResultadoDeMatchPerfil[] {
  const out: ResultadoDeMatchPerfil[] = [];
  for (const p of perfis) {
    const hit = casarPerfil(pub, p, agora);
    if (hit) out.push(hit);
  }
  return out;
}
