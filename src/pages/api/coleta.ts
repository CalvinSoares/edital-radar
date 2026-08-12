import type { APIRoute } from "astro";
import { rodarDia } from "../../server/coleta/rodar";
import { hojeEmSaoPaulo } from "../../server/coleta/calendario";

export const prerender = false;

// Chamado pelo cron da Vercel (GET com Authorization: Bearer) ou manualmente
// (POST com x-coleta-secret). Nunca pela UI.
function autorizado(request: Request): boolean {
  const secret = import.meta.env.COLETA_SECRET;
  if (!secret) return false;
  const bearer = request.headers.get("authorization");
  const header = request.headers.get("x-coleta-secret");
  return bearer === `Bearer ${secret}` || header === secret;
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

  const url = new URL(request.url);
  const dataAlvo = url.searchParams.get("data") ?? hojeEmSaoPaulo(new Date());
  const log = (m: string) => console.error(`[coleta] ${m}`);

  const resumo = await rodarDia(dataAlvo, {
    salvarPublicacoes: (rows) => upsertPublicacoes(db, rows),
    listarKeywords: () => listarKeywordsParaMatch(db),
    salvarConteudos: (casadas) => salvarConteudos(db, casadas),
    criarAlertas: (matches) => criarAlertas(db, matches),
    enviarDigests: () =>
      enviarDigests({
        listarPendentes: () => listarPendentesParaDigest(db),
        marcarEnviados: (ids) => marcarEnviados(db, ids),
        cliente: criarClienteDeEmail({
          apiKey: import.meta.env.RESEND_API_KEY,
          modo: import.meta.env.RESEND_MODE,
          remetente: import.meta.env.EMAIL_REMETENTE ?? "Edital Radar <avisos@editalradar.com.br>",
          log,
        }),
        dataAlvo,
        siteUrl: import.meta.env.SITE_URL ?? "http://localhost:4321",
        log,
      }),
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
