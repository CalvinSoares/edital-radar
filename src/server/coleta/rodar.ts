// Orquestra a rodada diária completa: ingestão → match full-text → alertas.
// A execução é registrada SEMPRE, inclusive em erro — silêncio parece normal,
// e é assim que produto de alerta morre.

import { ingerirDia } from "./ingerir";
import { casarDia } from "./casar-dia";
import { precisaAlarme, renderizarAlarme } from "./alarme";
import { CATALOGO_DE_TEMAS } from "../match/temas";
import type { buscarPaginaDoDia, buscarDetalhe } from "./cliente-doe";
import type { PublicacaoNormalizada } from "./normalizar";
import type { StatusDaColeta } from "./calendario";
import type { KeywordParaMatch, ResultadoDeMatch } from "../match/casar-keywords";
import type { PerfilParaMatch } from "../match/casar-perfil";
import type { ResumoDoMatch } from "./casar-dia";
import type { ResumoDoEnvio } from "../alerta/enviar-digests";

// Falha de detalhe acima disso indica problema sistêmico, não pontual.
const LIMITE_DE_FALHAS_DE_DETALHE = 0.1;

export type ResumoDaRodada = {
  dataAlvo: string;
  status: StatusDaColeta;
  totalColetado: number;
  totalCasado: number;
  alertasCriados: number;
  temasClassificados: number;
  retificacoesCriadas: number;
  falhasDeDetalhe: number;
  emailsEnviados: number;
  alertasEnviados: number;
  falhasDeEnvio: number;
  erro: string | null;
};

export type DepsDaRodada = {
  salvarPublicacoes: (rows: PublicacaoNormalizada[]) => Promise<void>;
  listarKeywords: () => Promise<KeywordParaMatch[]>;
  /** Perfis Radar ativos (pode ser lista vazia). */
  listarPerfis: () => Promise<PerfilParaMatch[]>;
  salvarConteudos: (casadas: ResumoDoMatch["casadas"]) => Promise<void>;
  /** Insere alertas (dedup pelo UNIQUE do banco); devolve quantos entraram. */
  criarAlertas: (matches: ResultadoDeMatch[]) => Promise<number>;
  /** Persiste a classificação por tema (páginas SEO); devolve quantos entraram. */
  salvarTemas: (pares: { pubSlug: string; tema: string }[]) => Promise<number>;
  /**
   * Avisos de retificação vinculados a alertas anteriores.
   * Opcional: se ausente, só o match normal roda.
   */
  criarAlertasRetificacao?: (
    pubs: { slug: string; titulo: string; hierarchy: string | null }[],
  ) => Promise<number>;
  /** Envia os digests pendentes (inclui restos de dias com falha de envio). */
  enviarDigests: () => Promise<ResumoDoEnvio>;
  /**
   * Notificação interna quando a rodada falha (0 pubs em dia útil, etc.).
   * Opcional: sem ela, só o registro + HTTP 500 do cron ficam.
   */
  notificarAlarme?: (msg: { assunto: string; texto: string; html: string }) => Promise<void>;
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
  let temasClassificados = 0;
  let retificacoesCriadas = 0;
  let falhasDeDetalhe = 0;
  let envio: ResumoDoEnvio = { emails: 0, alertasEnviados: 0, falhas: 0 };
  let erro = ingestao.erro;

  // 2. Match full-text (keywords + temas) + 3. alertas — só se a ingestão rendeu algo.
  if (!erro && ingestao.totalColetado > 0) {
    try {
      const keywords = await deps.listarKeywords();
      const perfis = await deps.listarPerfis();
      const resumoDoMatch = await casarDia({
        publicacoes: publicacoesDoDia.map((p) => ({
          slug: p.slug,
          titulo: p.titulo,
          excerpt: p.excerpt,
          hierarchy: p.hierarchy,
        })),
        keywords,
        temas: CATALOGO_DE_TEMAS,
        perfis,
        buscarDetalhe: deps.buscarDetalhe,
        log,
      });
      totalCasado = resumoDoMatch.matches.length;
      falhasDeDetalhe = resumoDoMatch.totalComFalhaDeDetalhe;
      await deps.salvarConteudos(resumoDoMatch.casadas);
      alertasCriados = await deps.criarAlertas(resumoDoMatch.matches);
      temasClassificados = await deps.salvarTemas(resumoDoMatch.temasCasados);

      if (deps.criarAlertasRetificacao) {
        retificacoesCriadas = await deps.criarAlertasRetificacao(
          publicacoesDoDia.map((p) => ({
            slug: p.slug,
            titulo: p.titulo,
            hierarchy: p.hierarchy,
          })),
        );
        alertasCriados += retificacoesCriadas;
      }

      if (falhasDeDetalhe / ingestao.totalColetado > LIMITE_DE_FALHAS_DE_DETALHE) {
        erro = `${falhasDeDetalhe} de ${ingestao.totalColetado} detalhes falharam — acima do limite`;
      }
    } catch (e) {
      erro = e instanceof Error ? e.message : String(e);
    }
  }

  // 4. Envio dos digests — roda mesmo em dia sem edição: pode haver alerta
  // pendente de uma falha de envio anterior. Só é pulado se a rodada já errou.
  if (!erro) {
    try {
      envio = await deps.enviarDigests();
      if (envio.falhas > 0) {
        log(`${envio.falhas} digest(s) falharam no envio — permanecem pendentes`);
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
    temasClassificados,
    retificacoesCriadas,
    falhasDeDetalhe,
    emailsEnviados: envio.emails,
    alertasEnviados: envio.alertasEnviados,
    falhasDeEnvio: envio.falhas,
    erro,
  };

  await deps.registrar(resumo);

  if (precisaAlarme(resumo)) {
    const msg = renderizarAlarme(resumo);
    log(`ALARME: ${msg.assunto} — ${resumo.erro}`);
    if (deps.notificarAlarme) {
      try {
        await deps.notificarAlarme(msg);
      } catch (e) {
        log(`falha ao notificar alarme: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  return resumo;
}
