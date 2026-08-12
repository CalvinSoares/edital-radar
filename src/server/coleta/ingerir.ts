import { buscarPaginaDoDia, type PaginaDeBusca } from "./cliente-doe";
import { normalizarItem, type PublicacaoNormalizada } from "./normalizar";
import { decidirStatus, type StatusDaColeta } from "./calendario";

// 100 por página × 100 páginas = 10 mil publicações/dia de teto — o DOE fica
// em ~3,4 mil. Se o teto for atingido, o resumo acusa (nada de corte mudo).
const POR_PAGINA = 100;
const MAX_PAGINAS = 100;

export type ResumoDaColeta = {
  dataAlvo: string;
  status: StatusDaColeta;
  totalColetado: number;
  paginas: number;
  atingiuTeto: boolean;
  erro: string | null;
};

export type DepsDeIngestao = {
  /** Persiste um lote de publicações (UPSERT por slug). No dry-run: no-op. */
  salvar: (rows: PublicacaoNormalizada[]) => Promise<void>;
  /** Registra a execução em coleta_execucao. No dry-run: no-op. */
  registrar: (resumo: ResumoDaColeta) => Promise<void>;
  buscarPagina?: typeof buscarPaginaDoDia;
  log?: (mensagem: string) => void;
};

/**
 * Ingestão de um dia do DOE: pagina, valida (Zod na borda, dentro do
 * cliente), normaliza e persiste. Idempotente — o UPSERT é por slug.
 * A execução é registrada SEMPRE, inclusive em erro: silêncio parece normal,
 * e é assim que produto de alerta morre.
 */
export async function ingerirDia(dataAlvo: string, deps: DepsDeIngestao): Promise<ResumoDaColeta> {
  const { salvar, registrar, buscarPagina = buscarPaginaDoDia, log = () => {} } = deps;

  let totalColetado = 0;
  let paginas = 0;
  let atingiuTeto = false;
  let erro: string | null = null;

  try {
    let pagina = 1;
    let temProxima = true;
    while (temProxima) {
      if (pagina > MAX_PAGINAS) {
        atingiuTeto = true;
        log(`teto de ${MAX_PAGINAS} páginas atingido — coleta incompleta para ${dataAlvo}`);
        break;
      }
      const resultado: PaginaDeBusca = await buscarPagina(dataAlvo, pagina, POR_PAGINA);
      const rows = resultado.items.map(normalizarItem);
      await salvar(rows);
      totalColetado += rows.length;
      paginas = pagina;
      temProxima = resultado.hasNextPage;
      pagina += 1;
      log(`${dataAlvo} página ${resultado.currentPage}/${resultado.totalPages}: +${rows.length} (total ${totalColetado})`);
    }
  } catch (e) {
    erro = e instanceof Error ? e.message : String(e);
  }

  const status: StatusDaColeta = erro ? "erro" : decidirStatus(totalColetado, dataAlvo);
  const resumo: ResumoDaColeta = { dataAlvo, status, totalColetado, paginas, atingiuTeto, erro };

  await registrar(resumo);
  return resumo;
}
