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

const CONCORRENCIA_PADRAO = 8;

export type PublicacaoDoDia = {
  slug: string;
  titulo: string;
  excerpt: string | null;
};

export type ResumoDoMatch = {
  totalVarrido: number;
  totalComFalhaDeDetalhe: number;
  matches: ResultadoDeMatch[];
  /** Publicações que casaram (para persistir o content). */
  casadas: { slug: string; content: string | null; brutoDetalhe: DetalheDePublicacao }[];
};

export type DepsDoMatch = {
  publicacoes: readonly PublicacaoDoDia[];
  keywords: readonly KeywordParaMatch[];
  buscarDetalhe?: typeof buscarDetalheReal;
  concorrencia?: number;
  log?: (mensagem: string) => void;
};

export async function casarDia(deps: DepsDoMatch): Promise<ResumoDoMatch> {
  const {
    publicacoes,
    keywords,
    buscarDetalhe = buscarDetalheReal,
    concorrencia = CONCORRENCIA_PADRAO,
    log = () => {},
  } = deps;

  const matches: ResultadoDeMatch[] = [];
  const casadas: ResumoDoMatch["casadas"] = [];
  let totalComFalhaDeDetalhe = 0;
  let processadas = 0;

  if (keywords.length === 0) {
    return { totalVarrido: 0, totalComFalhaDeDetalhe: 0, matches, casadas };
  }

  const resultados = await mapComLimite(publicacoes, concorrencia, async (pub) => {
    const detalhe = await buscarDetalhe(pub.slug);
    processadas += 1;
    if (processadas % 500 === 0) log(`detalhes: ${processadas}/${publicacoes.length}`);
    return { pub, detalhe };
  });

  for (const r of resultados) {
    if ("erro" in r) {
      // Falha pontual não derruba o dia — mas é contada e reportada.
      totalComFalhaDeDetalhe += 1;
      continue;
    }
    const { pub, detalhe } = r.ok;
    const daPublicacao = casarKeywords(
      { slug: pub.slug, titulo: pub.titulo, excerpt: pub.excerpt, content: detalhe.content },
      keywords,
    );
    if (daPublicacao.length > 0) {
      matches.push(...daPublicacao);
      casadas.push({ slug: pub.slug, content: detalhe.content ?? null, brutoDetalhe: detalhe });
    }
  }

  return { totalVarrido: publicacoes.length, totalComFalhaDeDetalhe, matches, casadas };
}
