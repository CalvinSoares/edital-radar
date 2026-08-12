// Orquestra a rodada diária completa: ingestão → match full-text → alertas.
// A execução é registrada SEMPRE, inclusive em erro — silêncio parece normal,
// e é assim que produto de alerta morre.

import { ingerirDia } from "./ingerir";
import { casarDia } from "./casar-dia";
import type { buscarPaginaDoDia, buscarDetalhe } from "./cliente-doe";
import type { PublicacaoNormalizada } from "./normalizar";
import type { StatusDaColeta } from "./calendario";
import type { KeywordParaMatch, ResultadoDeMatch } from "../match/casar-keywords";
import type { ResumoDoMatch } from "./casar-dia";

// Falha de detalhe acima disso indica problema sistêmico, não pontual.
const LIMITE_DE_FALHAS_DE_DETALHE = 0.1;

export type ResumoDaRodada = {
  dataAlvo: string;
  status: StatusDaColeta;
  totalColetado: number;
  totalCasado: number;
  alertasCriados: number;
  falhasDeDetalhe: number;
  erro: string | null;
};

export type DepsDaRodada = {
  salvarPublicacoes: (rows: PublicacaoNormalizada[]) => Promise<void>;
  listarKeywords: () => Promise<KeywordParaMatch[]>;
  salvarConteudos: (casadas: ResumoDoMatch["casadas"]) => Promise<void>;
  /** Insere alertas (dedup pelo UNIQUE do banco); devolve quantos entraram. */
  criarAlertas: (matches: ResultadoDeMatch[]) => Promise<number>;
  registrar: (resumo: ResumoDaRodada) => Promise<void>;
  buscarPagina?: typeof buscarPaginaDoDia;
  buscarDetalhe?: typeof buscarDetalhe;
  log?: (mensagem: string) => void;
};

export async function rodarDia(dataAlvo: string, deps: DepsDaRodada): Promise<ResumoDaRodada> {
  const log = deps.log ?? (() => {});

  // 1. Ingestão — acumula as publicações do dia para a fase de match.
  const publicacoesDoDia: PublicacaoNormalizada[] = [];
  const ingestao = await ingerirDia(dataAlvo, {
    salvar: async (rows) => {
      publicacoesDoDia.push(...rows);
      await deps.salvarPublicacoes(rows);
    },
    registrar: async () => {}, // rodarDia registra uma única vez, no fim
    buscarPagina: deps.buscarPagina,
    log,
  });

  let totalCasado = 0;
  let alertasCriados = 0;
  let falhasDeDetalhe = 0;
  let erro = ingestao.erro;

  // 2. Match full-text + 3. alertas — só se a ingestão rendeu algo.
  if (!erro && ingestao.totalColetado > 0) {
    try {
      const keywords = await deps.listarKeywords();
      if (keywords.length > 0) {
        const resumoDoMatch = await casarDia({
          publicacoes: publicacoesDoDia.map((p) => ({
            slug: p.slug,
            titulo: p.titulo,
            excerpt: p.excerpt,
          })),
          keywords,
          buscarDetalhe: deps.buscarDetalhe,
          log,
        });
        totalCasado = resumoDoMatch.matches.length;
        falhasDeDetalhe = resumoDoMatch.totalComFalhaDeDetalhe;
        await deps.salvarConteudos(resumoDoMatch.casadas);
        alertasCriados = await deps.criarAlertas(resumoDoMatch.matches);

        if (falhasDeDetalhe / ingestao.totalColetado > LIMITE_DE_FALHAS_DE_DETALHE) {
          erro = `${falhasDeDetalhe} de ${ingestao.totalColetado} detalhes falharam — acima do limite`;
        }
      } else {
        log("nenhuma keyword ativa — fase de match pulada");
      }
    } catch (e) {
      erro = e instanceof Error ? e.message : String(e);
    }
  }

  const status: StatusDaColeta = erro ? "erro" : ingestao.status;
  const resumo: ResumoDaRodada = {
    dataAlvo,
    status,
    totalColetado: ingestao.totalColetado,
    totalCasado,
    alertasCriados,
    falhasDeDetalhe,
    erro,
  };

  await deps.registrar(resumo);
  return resumo;
}
