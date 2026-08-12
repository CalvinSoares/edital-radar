// Fase de match do job diário — cobertura FULL-TEXT.
//
// Por que baixar o texto completo de tudo: a busca da própria API é sensível
// a acento ("chamamento publico" acha ~0; medido em 2026-08-12), e usuário
// digita sem acento. Só o match local, insensível a acento, dá a cobertura
// que o produto promete. O content é persistido apenas para quem casou —
// o resto é processado em memória e descartado.

import { buscarDetalhe as buscarDetalheReal, type DetalheDePublicacao } from "./cliente-doe";
import { mapComLimite } from "./concorrencia";
import {
  casarKeywords,
  type KeywordParaMatch,
  type ResultadoDeMatch,
} from "../match/casar-keywords";
import type { TemaDoCatalogo } from "../match/temas";
import { ehOportunidadeAberta } from "../match/oportunidade-aberta";
import { casarPerfis, type PerfilParaMatch } from "../match/casar-perfil";

const CONCORRENCIA_PADRAO = 8;

export type PublicacaoDoDia = {
  slug: string;
  titulo: string;
  excerpt: string | null;
  hierarchy?: string | null;
};

export type ResumoDoMatch = {
  totalVarrido: number;
  totalComFalhaDeDetalhe: number;
  matches: ResultadoDeMatch[];
  /** Publicações que casaram com keyword ou perfil (para persistir o content). */
  casadas: { slug: string; content: string | null; brutoDetalhe: DetalheDePublicacao }[];
  /** Classificação por tema (páginas SEO) — mesma passada, custo zero extra. */
  temasCasados: { pubSlug: string; tema: string }[];
};

export type DepsDoMatch = {
  publicacoes: readonly PublicacaoDoDia[];
  keywords: readonly KeywordParaMatch[];
  temas?: readonly TemaDoCatalogo[];
  /** Perfis Radar (causa+região) — só assinantes plano radar. */
  perfis?: readonly PerfilParaMatch[];
  buscarDetalhe?: typeof buscarDetalheReal;
  concorrencia?: number;
  agora?: Date;
  log?: (mensagem: string) => void;
};

export async function casarDia(deps: DepsDoMatch): Promise<ResumoDoMatch> {
  const {
    publicacoes,
    keywords,
    temas = [],
    perfis = [],
    buscarDetalhe = buscarDetalheReal,
    concorrencia = CONCORRENCIA_PADRAO,
    agora = new Date(),
    log = () => {},
  } = deps;

  const matches: ResultadoDeMatch[] = [];
  const casadas: ResumoDoMatch["casadas"] = [];
  const temasCasados: ResumoDoMatch["temasCasados"] = [];
  let totalComFalhaDeDetalhe = 0;
  let processadas = 0;

  if (keywords.length === 0 && temas.length === 0 && perfis.length === 0) {
    return { totalVarrido: 0, totalComFalhaDeDetalhe: 0, matches, casadas, temasCasados };
  }

  const keywordsDeTema: KeywordParaMatch[] = temas.flatMap((t) =>
    t.termos.map((termo, i) => ({ id: `${t.slug}#${i}`, assinanteId: t.slug, termo })),
  );

  const resultados = await mapComLimite(publicacoes, concorrencia, async (pub) => {
    const detalhe = await buscarDetalhe(pub.slug);
    processadas += 1;
    if (processadas % 500 === 0) log(`detalhes: ${processadas}/${publicacoes.length}`);
    return { pub, detalhe };
  });

  const slugsCasados = new Set<string>();

  for (const r of resultados) {
    if ("erro" in r) {
      totalComFalhaDeDetalhe += 1;
      continue;
    }
    const { pub, detalhe } = r.ok;
    const paraMatch = {
      slug: pub.slug,
      titulo: pub.titulo,
      excerpt: pub.excerpt,
      content: detalhe.content,
      hierarchy: pub.hierarchy ?? null,
    };

    const daPublicacao = casarKeywords(paraMatch, keywords).filter(() =>
      ehOportunidadeAberta(pub.titulo),
    );
    if (daPublicacao.length > 0) {
      matches.push(...daPublicacao.map((m) => ({ ...m, origem: "keyword" as const })));
      slugsCasados.add(pub.slug);
    }

    if (perfis.length > 0) {
      const doPerfil = casarPerfis(paraMatch, perfis, agora);
      if (doPerfil.length > 0) {
        matches.push(...doPerfil);
        slugsCasados.add(pub.slug);
      }
    }

    if (slugsCasados.has(pub.slug)) {
      casadas.push({ slug: pub.slug, content: detalhe.content ?? null, brutoDetalhe: detalhe });
    }

    if (keywordsDeTema.length > 0) {
      const doTema = casarKeywords(paraMatch, keywordsDeTema);
      const slugsDeTema = new Set(doTema.map((m) => m.assinanteId));
      for (const tema of slugsDeTema) temasCasados.push({ pubSlug: pub.slug, tema });
    }
  }

  return { totalVarrido: publicacoes.length, totalComFalhaDeDetalhe, matches, casadas, temasCasados };
}
