/**
 * map com limite de concorrência — usado para buscar detalhes do DOE sem
 * martelar a API (gentileza com serviço público). Preserva a ordem.
 * Erros não derrubam o lote: cada posição vira { ok } ou { erro }.
 */
export type ResultadoDoLote<R> = { ok: R } | { erro: string };

export async function mapComLimite<T, R>(
  itens: readonly T[],
  limite: number,
  fn: (item: T, indice: number) => Promise<R>,
): Promise<ResultadoDoLote<R>[]> {
  const resultados: ResultadoDoLote<R>[] = new Array(itens.length);
  let proximo = 0;

  async function trabalhador(): Promise<void> {
    while (proximo < itens.length) {
      const i = proximo++;
      try {
        resultados[i] = { ok: await fn(itens[i]!, i) };
      } catch (e) {
        resultados[i] = { erro: e instanceof Error ? e.message : String(e) };
      }
    }
  }

  const trabalhadores = Array.from({ length: Math.max(1, Math.min(limite, itens.length)) }, trabalhador);
  await Promise.all(trabalhadores);
  return resultados;
}
