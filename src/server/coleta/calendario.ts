// Helpers puros de data — sem Date.now() aqui dentro: quem chama passa o "agora".

/** Dia da semana de uma data YYYY-MM-DD (0 = domingo, 6 = sábado). */
export function diaDaSemana(dataAlvo: string): number {
  const [ano, mes, dia] = dataAlvo.split("-").map(Number);
  return new Date(Date.UTC(ano!, mes! - 1, dia!)).getUTCDay();
}

export function ehFimDeSemana(dataAlvo: string): boolean {
  const dia = diaDaSemana(dataAlvo);
  return dia === 0 || dia === 6;
}

/** Data de hoje (YYYY-MM-DD) no fuso America/Sao_Paulo. */
export function hojeEmSaoPaulo(agora: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(agora);
}

export type StatusDaColeta = "ok" | "sem_edicao" | "erro";

/**
 * 0 publicações em fim de semana é normal (DOE não circula).
 * 0 publicações em dia útil é alarme — a API pode ter mudado.
 * Limitação conhecida: feriado em dia útil também dispara "erro";
 * melhor um alarme falso por feriado que um dia real perdido em silêncio.
 */
export function decidirStatus(totalColetado: number, dataAlvo: string): StatusDaColeta {
  if (totalColetado > 0) return "ok";
  return ehFimDeSemana(dataAlvo) ? "sem_edicao" : "erro";
}
