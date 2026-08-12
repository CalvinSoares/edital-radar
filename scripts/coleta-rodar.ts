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
    listarPerfis: async () => [],
    salvarConteudos: async () => {},
    criarAlertas: async () => 0,
    salvarTemas: async () => 0,
    enviarDigests: async () => ({ emails: 0, alertasEnviados: 0, falhas: 0 }),
    registrar: async () => {},
  };
} else {
  const { db } = await import("../src/server/db/cliente");
  const { upsertPublicacoes, salvarConteudos } = await import(
    "../src/server/db/repositorios/publicacoes"
  );
  const { registrarExecucao } = await import("../src/server/db/repositorios/coleta");
  const { listarKeywordsParaMatch } = await import("../src/server/db/repositorios/keywords");
  const { criarAlertas, listarPendentesParaDigest, marcarEnviados } = await import(
    "../src/server/db/repositorios/alertas"
  );
  const { enviarDigests } = await import("../src/server/alerta/enviar-digests");
  const { criarClienteDeEmail } = await import("../src/server/alerta/resend");
  const { salvarTemas } = await import("../src/server/db/repositorios/temas");

  const clienteEmail = criarClienteDeEmail({
    apiKey: process.env.RESEND_API_KEY,
    modo: process.env.RESEND_MODE,
    remetente: process.env.EMAIL_REMETENTE ?? "Edital Radar <avisos@editalradar.com.br>",
    log: (m) => console.log(`  ${m}`),
  });
  const siteUrl = process.env.SITE_URL ?? "http://localhost:4321";
  const alarmePara = process.env.ALARME_EMAIL;

  deps = {
    salvarPublicacoes: (rows) => upsertPublicacoes(db, rows),
    listarKeywords: () => listarKeywordsParaMatch(db),
    listarPerfis: async () => {
      const { listarPerfisParaMatch } = await import("../src/server/db/repositorios/perfil");
      return listarPerfisParaMatch(db);
    },
    salvarConteudos: (casadas) => salvarConteudos(db, casadas),
    criarAlertas: (matches) => criarAlertas(db, matches),
    salvarTemas: (pares) => salvarTemas(db, pares),
    criarAlertasRetificacao: async (pubs) => {
      const { criarAlertasDeRetificacao } = await import(
        "../src/server/db/repositorios/retificacao"
      );
      return criarAlertasDeRetificacao(db, pubs);
    },
    enviarDigests: async () => {
      const normal = await enviarDigests({
        listarPendentes: () => listarPendentesParaDigest(db),
        marcarEnviados: (ids) => marcarEnviados(db, ids),
        cliente: clienteEmail,
        dataAlvo,
        siteUrl,
        log: (m) => console.log(`  ${m}`),
      });
      const { enviarDigestsVazios } = await import("../src/server/alerta/digest-vazio");
      const { listarCandidatosDigestVazio, registrarDigestVazio } = await import(
        "../src/server/db/repositorios/digest-vazio"
      );
      const vazios = await enviarDigestsVazios({
        listarCandidatos: () => listarCandidatosDigestVazio(db, dataAlvo),
        registrarEnvio: (id, sem) => registrarDigestVazio(db, id, sem),
        cliente: clienteEmail,
        dataAlvo,
        siteUrl,
        log: (m) => console.log(`  ${m}`),
      });
      return {
        emails: normal.emails + vazios.emails,
        alertasEnviados: normal.alertasEnviados,
        falhas: normal.falhas + vazios.falhas,
      };
    },
    notificarAlarme: async (msg) => {
      if (!alarmePara) {
        console.log(`  alarme sem ALARME_EMAIL: ${msg.assunto}`);
        return;
      }
      await clienteEmail.enviar({
        para: alarmePara,
        assunto: msg.assunto,
        html: msg.html,
        texto: msg.texto,
        urlDescadastro: siteUrl,
      });
    },
    registrar: (r) =>
      registrarExecucao(db, {
        dataAlvo: r.dataAlvo,
        status: r.status,
        totalColetado: r.totalColetado,
        totalCasado: r.totalCasado,
        totalEnviado: r.alertasEnviados,
        erro: r.erro,
      }),
  };
}

console.log(`Rodada ${dryRun ? "(dry-run) " : ""}para ${dataAlvo}…`);

const resumo = await rodarDia(dataAlvo, { ...deps, log: (m) => console.log(`  ${m}`) });

console.log(JSON.stringify(resumo, null, 2));
process.exit(resumo.status === "erro" ? 1 : 0);
