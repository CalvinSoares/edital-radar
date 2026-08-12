// Roda a rodada diária localmente (CLI).
//
//   pnpm coleta:rodar -- --data=2026-08-11            # grava no banco (exige DATABASE_URL)
//   pnpm coleta:rodar -- --data=2026-08-11 --dry-run  # ingestão sem banco (match pulado sem keywords)
//
// Sem --data: hoje em America/Sao_Paulo.

import { rodarDia, type DepsDaRodada } from "../src/server/coleta/rodar";
import { hojeEmSaoPaulo } from "../src/server/coleta/calendario";

const args = new Map(
  process.argv.slice(2).map((a) => {
    const [chave, valor] = a.replace(/^--/, "").split("=");
    return [chave!, valor ?? "true"] as const;
  }),
);

const dataAlvo = args.get("data") ?? hojeEmSaoPaulo(new Date());
const dryRun = args.get("dry-run") === "true";

if (!/^\d{4}-\d{2}-\d{2}$/.test(dataAlvo)) {
  console.error(`--data inválida: ${dataAlvo} (esperado YYYY-MM-DD)`);
  process.exit(1);
}

let deps: DepsDaRodada;

if (dryRun) {
  deps = {
    salvarPublicacoes: async () => {},
    listarKeywords: async () => [], // sem banco não há keywords — match é pulado
    salvarConteudos: async () => {},
    criarAlertas: async () => 0,
    registrar: async () => {},
  };
} else {
  const { db } = await import("../src/server/db/cliente");
  const { upsertPublicacoes, salvarConteudos } = await import(
    "../src/server/db/repositorios/publicacoes"
  );
  const { registrarExecucao } = await import("../src/server/db/repositorios/coleta");
  const { listarKeywordsParaMatch } = await import("../src/server/db/repositorios/keywords");
  const { criarAlertas } = await import("../src/server/db/repositorios/alertas");

  deps = {
    salvarPublicacoes: (rows) => upsertPublicacoes(db, rows),
    listarKeywords: () => listarKeywordsParaMatch(db),
    salvarConteudos: (casadas) => salvarConteudos(db, casadas),
    criarAlertas: (matches) => criarAlertas(db, matches),
    registrar: (r) =>
      registrarExecucao(db, {
        dataAlvo: r.dataAlvo,
        status: r.status,
        totalColetado: r.totalColetado,
        totalCasado: r.totalCasado,
        totalEnviado: 0,
        erro: r.erro,
      }),
  };
}

console.log(`Rodada ${dryRun ? "(dry-run) " : ""}para ${dataAlvo}…`);

const resumo = await rodarDia(dataAlvo, { ...deps, log: (m) => console.log(`  ${m}`) });

console.log(JSON.stringify(resumo, null, 2));
process.exit(resumo.status === "erro" ? 1 : 0);
