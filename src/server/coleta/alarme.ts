// Alarme interno do job — silêncio parece normal, e é assim que produto
// de alerta morre. Qualquer status "erro" (0 pubs em dia útil, falha de
// detalhe, provedor fora) dispara notificação.

import type { StatusDaColeta } from "../coleta/calendario";

export type ResumoParaAlarme = {
  dataAlvo: string;
  status: StatusDaColeta;
  totalColetado: number;
  falhasDeDetalhe?: number;
  erro: string | null;
};

export function precisaAlarme(resumo: ResumoParaAlarme): boolean {
  return resumo.status === "erro";
}

export function renderizarAlarme(resumo: ResumoParaAlarme): {
  assunto: string;
  texto: string;
  html: string;
} {
  const motivo = resumo.erro ?? "status erro sem mensagem";
  const assunto = `[Edital Radar] Coleta em erro — ${resumo.dataAlvo}`;
  const texto = [
    `A rodada de ${resumo.dataAlvo} terminou com status erro.`,
    "",
    `Total coletado: ${resumo.totalColetado}`,
    resumo.falhasDeDetalhe != null ? `Falhas de detalhe: ${resumo.falhasDeDetalhe}` : null,
    `Motivo: ${motivo}`,
    "",
    "0 publicações em dia útil costuma significar API do DOE fora do ar ou contrato quebrado.",
    "Fim de semana com 0 é normal (não dispara este alarme).",
  ]
    .filter((l) => l !== null)
    .join("\n");

  const html = `<pre style="font-family:ui-monospace,monospace;white-space:pre-wrap">${escapar(texto)}</pre>`;
  return { assunto, texto, html };
}

function escapar(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
