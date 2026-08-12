// Rate limit em memória — mitiga abuso em instância única.
// Em serverless (Vercel) cada isolate tem seu Map: ainda reduz rajadas,
// mas não é quota global. Suficiente pro piloto; billing/WAF depois.

export type OpcoesDeRateLimit = {
  /** Máximo de tentativas na janela. */
  max: number;
  /** Janela em ms. */
  janelaMs: number;
};

type Balde = { n: number; resetEm: number };

const baldes = new Map<string, Balde>();

/** True se a chamada pode seguir; false se estourou o limite. */
export function permitirRateLimit(chave: string, opts: OpcoesDeRateLimit): boolean {
  const agora = Date.now();
  const atual = baldes.get(chave);
  if (!atual || agora >= atual.resetEm) {
    baldes.set(chave, { n: 1, resetEm: agora + opts.janelaMs });
    return true;
  }
  if (atual.n >= opts.max) return false;
  atual.n += 1;
  return true;
}

/** Só para testes. */
export function _resetRateLimitParaTestes(): void {
  baldes.clear();
}
