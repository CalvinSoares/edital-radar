// Normalização de texto para match — pura, sem I/O.
//
// A propriedade central: `normalizarPreservandoIndices` devolve uma string
// com o MESMO comprimento da original (caixa baixa, sem acento). Assim, um
// índice achado no texto normalizado aponta para o mesmo lugar no original —
// é o que permite extrair o trecho legível para o e-mail.

function caractereBase(c: string): string {
  const decomposto = c.normalize("NFD");
  const base = decomposto[0] ?? c;
  const minusculo = base.toLowerCase();
  // toLowerCase de 1 caractere pode expandir em casos raros (İ) — trunca.
  return minusculo[0] ?? base;
}

export function normalizarPreservandoIndices(texto: string): string {
  let saida = "";
  for (let i = 0; i < texto.length; i++) {
    saida += caractereBase(texto[i]!);
  }
  return saida;
}

/** Normaliza um termo de busca: minúsculo, sem acento, espaços colapsados. */
export function normalizarTermo(termo: string): string {
  return normalizarPreservandoIndices(termo).trim().replace(/\s+/g, " ");
}
