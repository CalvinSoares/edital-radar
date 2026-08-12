// Seleção do digest — PURA: agrupa alertas pendentes por assinante e aplica
// o teto do e-mail. Um e-mail por assinante por dia, nunca um por publicação.

export const MAX_AVISOS_NO_EMAIL = 10;

export type AlertaPendente = {
  alertaId: string;
  assinanteId: string;
  email: string;
  descadastroToken: string;
  termo: string;
  titulo: string;
  trecho: string;
  slug: string;
  dataPublicacao: Date;
};

export type Digest = {
  assinanteId: string;
  email: string;
  descadastroToken: string;
  /** Avisos que entram no corpo do e-mail (máx. MAX_AVISOS_NO_EMAIL). */
  avisos: AlertaPendente[];
  /** Quantos ficaram de fora do corpo ("e mais N no seu painel"). */
  excedente: number;
  /** TODOS os alertas comunicados por este digest (corpo + excedente). */
  alertaIds: string[];
};

export function selecionarDigests(pendentes: readonly AlertaPendente[]): Digest[] {
  const porAssinante = new Map<string, AlertaPendente[]>();
  for (const p of pendentes) {
    const lista = porAssinante.get(p.assinanteId) ?? [];
    lista.push(p);
    porAssinante.set(p.assinanteId, lista);
  }

  const digests: Digest[] = [];
  for (const [assinanteId, alertas] of porAssinante) {
    const ordenados = [...alertas].sort(
      (a, b) => b.dataPublicacao.getTime() - a.dataPublicacao.getTime(),
    );
    digests.push({
      assinanteId,
      email: ordenados[0]!.email,
      descadastroToken: ordenados[0]!.descadastroToken,
      avisos: ordenados.slice(0, MAX_AVISOS_NO_EMAIL),
      excedente: Math.max(0, ordenados.length - MAX_AVISOS_NO_EMAIL),
      // O excedente também é marcado como comunicado — o e-mail avisa que
      // existe e aponta para o painel; não reaparece no digest de amanhã.
      alertaIds: ordenados.map((a) => a.alertaId),
    });
  }
  return digests;
}
