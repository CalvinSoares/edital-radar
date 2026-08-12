import type { APIRoute } from "astro";
import { rodarDia } from "../../server/coleta/rodar";
import { hojeEmSaoPaulo } from "../../server/coleta/calendario";
import { igualComTempoConstante } from "../../server/seguranca/crypto-admin";

export const prerender = false;

// Chamado pelo cron da Vercel (GET com Authorization: Bearer) ou manualmente
// (POST com x-coleta-secret). Nunca pela UI.
function autorizado(request: Request): boolean {
  const secret = import.meta.env.COLETA_SECRET;
  if (!secret) return false;
  const bearer = request.headers.get("authorization");
  const header = request.headers.get("x-coleta-secret");
  const token =
    bearer?.startsWith("Bearer ") ? bearer.slice("Bearer ".length) : header;
  if (!token) return false;
  return igualComTempoConstante(token, secret);
}

async function executar(request: Request): Promise<Response> {
  if (!autorizado(request)) {
    return new Response(JSON.stringify({ erro: "não autorizado" }), { status: 401 });
  }

  // Import tardio: o cliente do banco exige DATABASE_URL e não deve derrubar
  // o build/prerender das páginas públicas.
  const { db } = await import("../../server/db/cliente");
  const { upsertPublicacoes, salvarConteudos } = await import(
    "../../server/db/repositorios/publicacoes"
  );
  const { registrarExecucao } = await import("../../server/db/repositorios/coleta");
  const { listarKeywordsParaMatch } = await import("../../server/db/repositorios/keywords");
  const { criarAlertas, listarPendentesParaDigest, marcarEnviados } = await import(
    "../../server/db/repositorios/alertas"
  );
  const { enviarDigests } = await import("../../server/alerta/enviar-digests");
  const { criarClienteDeEmail } = await import("../../server/alerta/resend");
  const { salvarTemas } = await import("../../server/db/repositorios/temas");

  const url = new URL(request.url);
  const dataAlvo = url.searchParams.get("data") ?? hojeEmSaoPaulo(new Date());
  const log = (m: string) => console.error(`[coleta] ${m}`);

  const clienteEmail = criarClienteDeEmail({
    apiKey: import.meta.env.RESEND_API_KEY,
    modo: import.meta.env.RESEND_MODE,
    remetente: import.meta.env.EMAIL_REMETENTE ?? "Edital Radar <avisos@editalradar.com.br>",
    log,
  });
  const siteUrl = import.meta.env.SITE_URL ?? "http://localhost:4321";
  const alarmePara = import.meta.env.ALARME_EMAIL;

  const resumo = await rodarDia(dataAlvo, {
    salvarPublicacoes: (rows) => upsertPublicacoes(db, rows),
    listarKeywords: () => listarKeywordsParaMatch(db),
    listarPerfis: async () => {
      const { listarPerfisParaMatch } = await import("../../server/db/repositorios/perfil");
      return listarPerfisParaMatch(db);
    },
    salvarConteudos: (casadas) => salvarConteudos(db, casadas),
    criarAlertas: (matches) => criarAlertas(db, matches),
    salvarTemas: (pares) => salvarTemas(db, pares),
    criarAlertasRetificacao: async (pubs) => {
      const { criarAlertasDeRetificacao } = await import(
        "../../server/db/repositorios/retificacao"
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
        log,
      });
      const { enviarDigestsVazios } = await import("../../server/alerta/digest-vazio");
      const { listarCandidatosDigestVazio, registrarDigestVazio } = await import(
        "../../server/db/repositorios/digest-vazio"
      );
      const vazios = await enviarDigestsVazios({
        listarCandidatos: () => listarCandidatosDigestVazio(db, dataAlvo),
        registrarEnvio: (id, sem) => registrarDigestVazio(db, id, sem),
        cliente: clienteEmail,
        dataAlvo,
        siteUrl,
        log,
      });
      return {
        emails: normal.emails + vazios.emails,
        alertasEnviados: normal.alertasEnviados,
        falhas: normal.falhas + vazios.falhas,
      };
    },
    notificarAlarme: async (msg) => {
      if (!alarmePara) {
        log(`alarme sem ALARME_EMAIL: ${msg.assunto}`);
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
    log,
  });

  const httpStatus = resumo.status === "erro" ? 500 : 200;
  return new Response(JSON.stringify(resumo), {
    status: httpStatus,
    headers: { "Content-Type": "application/json" },
  });
}

export const GET: APIRoute = ({ request }) => executar(request);
export const POST: APIRoute = ({ request }) => executar(request);
