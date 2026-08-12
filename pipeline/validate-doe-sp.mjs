// Validação da fonte DOE-SP para o Edital Radar.
//
// Simula o job diário do produto: para cada dia do intervalo, busca as
// palavras-chave de fomento na API pública do Diário Oficial de SP e mede
// quantas oportunidades aparecem, em quais seções, e se o texto completo
// está acessível.
//
// Uso: node pipeline/validate-doe-sp.mjs [diasParaTras=7]

const API = "https://do-api-web-search.doe.sp.gov.br/v2";

// Termos que indicam oportunidade de fomento para OSC/ONG.
const KEYWORDS = [
  "chamamento público",
  "edital de fomento",
  "termo de fomento",
  "termo de colaboração",
  "organização da sociedade civil",
];

const daysBack = Number(process.argv[2] ?? 7);

function fmt(d) {
  return d.toISOString().slice(0, 10);
}

async function getJSON(url) {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} em ${url}`);
  return res.json();
}

async function searchDay(date, term) {
  const params = new URLSearchParams({
    PageNumber: "1",
    PageSize: "100",
    FromDate: date,
    ToDate: date,
  });
  params.append("Terms[0]", term);
  return getJSON(`${API}/advanced-search/publications?${params}`);
}

async function dayTotal(date) {
  const params = new URLSearchParams({
    PageNumber: "1",
    PageSize: "1",
    FromDate: date,
    ToDate: date,
  });
  const data = await getJSON(`${API}/advanced-search/publications?${params}`);
  return data.totalItems ?? 0;
}

const days = [];
for (let i = 0; i < daysBack; i++) {
  const d = new Date();
  d.setDate(d.getDate() - i);
  days.push(fmt(d));
}

const report = { geradoEm: new Date().toISOString(), dias: [], erros: [] };
const bySection = new Map();
const samples = [];

for (const date of days) {
  const entry = { data: date, totalPublicacoes: 0, porTermo: {} };
  try {
    entry.totalPublicacoes = await dayTotal(date);
    for (const term of KEYWORDS) {
      const result = await searchDay(date, term);
      entry.porTermo[term] = result.totalItems ?? result.items.length;
      for (const item of result.items) {
        const secao = item.hierarchy?.split(">").slice(0, 3).join(">").trim() ?? "?";
        bySection.set(secao, (bySection.get(secao) ?? 0) + 1);
        if (samples.length < 15 && /chamamento|fomento/i.test(term)) {
          samples.push({ data: date, termo: term, titulo: item.title, slug: item.slug, excerpt: item.excerpt?.slice(0, 200) });
        }
      }
    }
  } catch (err) {
    report.erros.push({ data: date, erro: String(err) });
  }
  report.dias.push(entry);
  console.log(`${date}: ${entry.totalPublicacoes} publicações |`,
    Object.entries(entry.porTermo).map(([t, n]) => `${t}: ${n}`).join(" | "));
}

// Valida acesso ao texto completo em uma amostra.
report.textoCompleto = [];
for (const s of samples.slice(0, 3)) {
  try {
    const pub = await getJSON(`${API}/publications/${s.slug}`);
    report.textoCompleto.push({ slug: s.slug, chars: pub.content?.length ?? 0, ok: (pub.content?.length ?? 0) > 100 });
  } catch (err) {
    report.textoCompleto.push({ slug: s.slug, ok: false, erro: String(err) });
  }
}

report.secoesMaisFrequentes = [...bySection.entries()]
  .sort((a, b) => b[1] - a[1])
  .slice(0, 12)
  .map(([secao, hits]) => ({ secao, hits }));
report.amostras = samples;

const { writeFileSync, mkdirSync } = await import("node:fs");
mkdirSync(new URL("../out/", import.meta.url), { recursive: true });
const outPath = new URL(`../out/validacao-doe-sp-${fmt(new Date())}.json`, import.meta.url);
writeFileSync(outPath, JSON.stringify(report, null, 2), "utf8");
console.log(`\nRelatório salvo em ${outPath.pathname}`);
console.log(`Texto completo acessível: ${report.textoCompleto.filter(t => t.ok).length}/${report.textoCompleto.length} amostras`);
