// Prova a cobertura full-text: a busca da API (sensível a acento) define o
// gabarito; nosso motor, com o termo SEM acento, precisa achar os mesmos
// documentos no content. Também mede o tempo de detalhe para dimensionar o job.
//   pnpm tsx pipeline/provar-fulltext.ts [YYYY-MM-DD]

import { buscarDetalhe } from "../src/server/coleta/cliente-doe";
import { mapComLimite } from "../src/server/coleta/concorrencia";
import { casarKeywords } from "../src/server/match/casar-keywords";

const dataAlvo = process.argv[2] ?? "2026-08-11";
const TERMO_GABARITO = "chamamento público"; // com acento — como a API exige
const TERMO_USUARIO = "chamamento publico"; // sem acento — como o usuário digita

const params = new URLSearchParams({
  PageNumber: "1",
  PageSize: "100",
  FromDate: dataAlvo,
  ToDate: dataAlvo,
});
params.append("Terms[0]", TERMO_GABARITO);
const res = await fetch(
  `https://do-api-web-search.doe.sp.gov.br/v2/advanced-search/publications?${params}`,
  { headers: { Accept: "application/json" } },
);
const gabarito = (await res.json()) as {
  totalItems: number;
  items: { slug: string; title: string; excerpt?: string | null }[];
};

console.log(`Gabarito da API (${TERMO_GABARITO}) em ${dataAlvo}: ${gabarito.totalItems} publicações`);

const inicio = performance.now();
const detalhes = await mapComLimite(gabarito.items, 8, (item) => buscarDetalhe(item.slug));
const ms = performance.now() - inicio;

let achados = 0;
const perdidos: string[] = [];
for (let i = 0; i < gabarito.items.length; i++) {
  const item = gabarito.items[i]!;
  const d = detalhes[i]!;
  if ("erro" in d) {
    perdidos.push(`${item.slug} (detalhe falhou: ${d.erro})`);
    continue;
  }
  const matches = casarKeywords(
    { slug: item.slug, titulo: item.title, excerpt: item.excerpt ?? null, content: d.ok.content },
    [{ id: "kw", assinanteId: "as", termo: TERMO_USUARIO }],
  );
  if (matches.length > 0) achados += 1;
  else perdidos.push(item.slug);
}

console.log(`Motor local (termo sem acento): ${achados}/${gabarito.items.length}`);
if (perdidos.length) console.log(`Perdidos:\n  ${perdidos.join("\n  ")}`);

const mediaMs = ms / gabarito.items.length;
const estimativa = Math.round(((3300 * mediaMs) / 8 / 1000) * 10) / 10;
console.log(
  `\nTempo de detalhe: ${Math.round(mediaMs)}ms/pub (concorrência 8) → ~${estimativa}s para 3.300 pubs/dia`,
);
