// Extração determinística de prazo — sempre com trecho-fonte.
// Se não achar data confiável, devolve null (não inventa).

const PADROES: RegExp[] = [
  /(?:prazo|inscri[cç][oõ]es?|entregas?|at[eé])\s*(?:final|limite)?\s*(?:em|de|:)?\s*(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/gi,
  /(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})\s*(?:\(.*?prazo.*?\)|como prazo)/gi,
];

export type PrazoExtraido = {
  data: Date;
  trecho: string;
  vencido: boolean;
};

export function extrairPrazo(texto: string, agora: Date): PrazoExtraido | null {
  if (!texto.trim()) return null;

  let melhor: PrazoExtraido | null = null;

  for (const padrao of PADROES) {
    padrao.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = padrao.exec(texto)) !== null) {
      const dia = Number(m[1]);
      const mes = Number(m[2]);
      let ano = Number(m[3]);
      if (ano < 100) ano += 2000;
      if (dia < 1 || dia > 31 || mes < 1 || mes > 12 || ano < 2020 || ano > 2100) continue;

      // Meio-dia em SP evita virar o dia anterior em UTC.
      const data = new Date(Date.UTC(ano, mes - 1, dia, 15, 0, 0));
      const inicio = Math.max(0, m.index - 40);
      const fim = Math.min(texto.length, m.index + m[0].length + 20);
      const trecho = texto.slice(inicio, fim).replace(/\s+/g, " ").trim();
      const vencido = data.getTime() < agora.getTime() - 24 * 60 * 60 * 1000;

      // Prefere o prazo mais próximo no futuro; se só houver vencidos, guarda o primeiro.
      if (!melhor) {
        melhor = { data, trecho, vencido };
      } else if (!vencido && (melhor.vencido || data < melhor.data)) {
        melhor = { data, trecho, vencido };
      }
    }
  }

  return melhor;
}

/** True se o prazo (quando existe) vence em menos de 48h e ainda não venceu. */
export function prazoUrgente(prazo: PrazoExtraido | null, agora: Date): boolean {
  if (!prazo || prazo.vencido) return false;
  const ms = prazo.data.getTime() - agora.getTime();
  return ms >= 0 && ms <= 48 * 60 * 60 * 1000;
}
