// Roda a coleta localmente (CLI).
//
//   pnpm coleta:rodar -- --data=2026-08-11            # grava no banco (exige DATABASE_URL)
//   pnpm coleta:rodar -- --data=2026-08-11 --dry-run  # só busca + valida + normaliza
//
// Sem --data: hoje em America/Sao_Paulo.

import { ingerirDia } from "../src/server/coleta/ingerir";
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

let salvar = async () => {};
let registrar = async () => {};

if (!dryRun) {
  const { db } = await import("../src/server/db/cliente");
  const { upsertPublicacoes } = await import("../src/server/db/repositorios/publicacoes");
  const { registrarExecucao } = await import("../src/server/db/repositorios/coleta");
  salvar = ((rows) => upsertPublicacoes(db, rows)) as typeof salvar;
  registrar = ((r: Parameters<Parameters<typeof ingerirDia>[1]["registrar"]>[0]) =>
    registrarExecucao(db, {
      dataAlvo: r.dataAlvo,
      status: r.status,
      totalColetado: r.totalColetado,
      totalCasado: 0,
      totalEnviado: 0,
      erro: r.erro,
    })) as typeof registrar;
}

console.log(`Coleta ${dryRun ? "(dry-run) " : ""}para ${dataAlvo}…`);

const resumo = await ingerirDia(dataAlvo, {
  salvar,
  registrar,
  log: (m) => console.log(`  ${m}`),
});

console.log(JSON.stringify(resumo, null, 2));
process.exit(resumo.status === "erro" ? 1 : 0);
