// Prova o motor de match contra o DOE real do dia — sem banco.
//   pnpm tsx pipeline/provar-match.ts [YYYY-MM-DD]

import { buscarPaginaDoDia } from "../src/server/coleta/cliente-doe";
import { normalizarItem } from "../src/server/coleta/normalizar";
import { hojeEmSaoPaulo } from "../src/server/coleta/calendario";
import { casarKeywords, type KeywordParaMatch, type ResultadoDeMatch } from "../src/server/match/casar-keywords";

const dataAlvo = process.argv[2] ?? hojeEmSaoPaulo(new Date());

const keywords: KeywordParaMatch[] = [
  { id: "kw-1", assinanteId: "demo", termo: "chamamento público" },
  { id: "kw-2", assinanteId: "demo", termo: "termo de fomento" },
  { id: "kw-3", assinanteId: "demo", termo: "organização da sociedade civil" },
];

const matches: ResultadoDeMatch[] = [];
let total = 0;
let pagina = 1;
let temProxima = true;

while (temProxima) {
  const r = await buscarPaginaDoDia(dataAlvo, pagina, 100);
  for (const item of r.items) {
    const pub = normalizarItem(item);
    matches.push(...casarKeywords({ slug: pub.slug, titulo: pub.titulo, excerpt: pub.excerpt }, keywords));
  }
  total += r.items.length;
  temProxima = r.hasNextPage;
  pagina += 1;
}

console.log(`${dataAlvo}: ${total} publicações varridas, ${matches.length} matches\n`);
const porTermo = new Map<string, number>();
for (const m of matches) porTermo.set(m.termo, (porTermo.get(m.termo) ?? 0) + 1);
for (const [termo, n] of porTermo) console.log(`  ${termo}: ${n}`);
console.log("\nAmostras:");
for (const m of matches.slice(0, 4)) {
  console.log(`\n• [${m.termo} → ${m.campo}] ${m.slug.slice(0, 80)}`);
  console.log(`  "${m.trecho.slice(0, 180)}"`);
}
